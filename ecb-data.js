// ECB Data Fetcher - Real ECB Interest Rate Data
// This module uses real historical ECB interest rate data from 1999-2025

class ECBDataFetcher {
  constructor() {
    this.baseUrl = 'https://sdw-wsrest.ecb.europa.eu/service/data';
    this.fallbackData = this.getFallbackData();
  }

  // ECB API endpoints for different rate types
  getApiEndpoints() {
    return {
      refi: 'FM.B.U2.EUR.4F.KR.MRR_FR.LEV', // Main Refinancing Rate
      deposit: 'FM.B.U2.EUR.4F.KR.MRR_DF.LEV', // Deposit Facility Rate
      lending: 'FM.B.U2.EUR.4F.KR.MRR_ML.LEV' // Marginal Lending Rate
    };
  }

  // Fetch data from ECB Statistical Data Warehouse
  async fetchECBData(rateType, startDate = '1999-01-01', endDate = null) {
    const endpoint = this.getApiEndpoints()[rateType];
    if (!endpoint) {
      console.error(`Unknown rate type: ${rateType}`);
      return null;
    }

    const endDateParam = endDate || new Date().toISOString().split('T')[0];
    const url = `${this.baseUrl}/${endpoint}?startPeriod=${startDate}&endPeriod=${endDateParam}&format=jsondata`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseECBResponse(data, rateType);
    } catch (error) {
      console.warn(`Failed to fetch ECB data for ${rateType}:`, error);
      return this.getFallbackData()[rateType];
    }
  }

  // Parse ECB API response
  parseECBResponse(data, rateType) {
    if (!data || !data.dataSets || !data.dataSets[0]) {
      return this.getFallbackData()[rateType];
    }

    const dataset = data.dataSets[0];
    const observations = dataset.series['0:0:0:0:0:0:0:0'].observations;
    
    const monthlyData = [];
    const labels = [];
    
    // Process observations
    Object.keys(observations).sort().forEach(key => {
      const value = observations[key][0];
      if (value !== null && value !== undefined) {
        const date = new Date(key);
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear();
        
        monthlyData.push(parseFloat(value));
        labels.push(month);
      }
    });

    // Group by year
    const yearlyData = this.groupByYear(monthlyData, labels);
    
    return {
      label: this.getRateLabel(rateType),
      data: yearlyData
    };
  }

  // Group monthly data by year - FIXED VERSION
  groupByYear(values, labels) {
    const yearlyGroups = {};
    
    values.forEach((value, index) => {
      // Calculate the actual year based on the data point
      // This assumes data is ordered from newest to oldest
      const currentYear = new Date().getFullYear();
      const year = currentYear - Math.floor(index / 12);
      
      if (!yearlyGroups[year]) {
        yearlyGroups[year] = {
          year: year,
          values: [],
          labels: []
        };
      }
      yearlyGroups[year].values.push(value);
      yearlyGroups[year].labels.push(labels[index]);
    });

    return Object.values(yearlyGroups).reverse();
  }

  // Get rate label
  getRateLabel(rateType) {
    const labels = {
      refi: 'Main Refinancing Rate',
      deposit: 'Deposit Facility Rate',
      lending: 'Marginal Lending Rate'
    };
    return labels[rateType] || rateType;
  }

  // Real historical data from 1999-2025, monthly interpolated for perfect continuity
  getFallbackData() {
    // Helper to build monthly arrays from change points
    function buildMonthlyArray(changes, startYear, endYear) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const data = [];
      let current = changes[0];
      let idx = 0;
      for (let year = startYear; year <= endYear; year++) {
        const values = [];
        for (let m = 0; m < 12; m++) {
          const dateStr = `${year}-${String(m+1).padStart(2,'0')}-01`;
          if (idx+1 < changes.length && new Date(changes[idx+1].date) <= new Date(dateStr)) {
            idx++;
            current = changes[idx];
          }
          values.push(current.value);
        }
        data.push({ year, values: [...values], labels: [...months] });
      }
      return data;
    }
    // Data points from your table (dates are first-of-month for interpolation)
    const refiChanges = [
      { date: '1999-01-01', value: 3.00 },
      { date: '1999-04-01', value: 2.50 },
      { date: '1999-11-01', value: 2.00 },
      { date: '2000-02-01', value: 3.00 },
      { date: '2001-05-01', value: 4.75 },
      { date: '2001-09-01', value: 4.25 },
      { date: '2001-11-01', value: 3.75 },
      { date: '2002-12-01', value: 2.75 },
      { date: '2003-06-01', value: 2.00 },
      { date: '2005-12-01', value: 2.25 },
      { date: '2006-03-01', value: 2.50 },
      { date: '2006-06-01', value: 2.75 },
      { date: '2006-08-01', value: 3.00 },
      { date: '2006-10-01', value: 3.25 },
      { date: '2006-12-01', value: 3.50 },
      { date: '2007-03-01', value: 3.75 },
      { date: '2007-06-01', value: 4.00 },
      { date: '2008-07-01', value: 4.25 },
      { date: '2008-10-01', value: 3.75 },
      { date: '2008-11-01', value: 3.25 },
      { date: '2008-12-01', value: 2.50 },
      { date: '2009-01-01', value: 2.00 },
      { date: '2009-03-01', value: 1.50 },
      { date: '2009-04-01', value: 1.25 },
      { date: '2009-05-01', value: 1.00 },
      { date: '2011-04-01', value: 1.25 },
      { date: '2011-07-01', value: 1.50 },
      { date: '2011-11-01', value: 1.25 },
      { date: '2011-12-01', value: 1.00 },
      { date: '2012-07-01', value: 0.75 },
      { date: '2013-05-01', value: 0.50 },
      { date: '2013-11-01', value: 0.25 },
      { date: '2014-09-01', value: 0.05 },
      { date: '2016-03-01', value: 0.00 },
      { date: '2022-07-01', value: 0.50 },
      { date: '2022-09-01', value: 1.25 },
      { date: '2022-10-01', value: 2.00 },
      { date: '2022-11-01', value: 2.50 },
      { date: '2023-02-01', value: 3.00 },
      { date: '2023-03-01', value: 3.50 },
      { date: '2023-04-01', value: 3.75 },
      { date: '2023-05-01', value: 4.00 },
      { date: '2023-06-01', value: 4.25 },
      { date: '2023-09-01', value: 4.50 },
      { date: '2024-01-01', value: 4.25 },
      { date: '2024-09-18', value: 3.65 },
      { date: '2024-10-23', value: 3.40 },
      { date: '2024-12-18', value: 3.15 },
      { date: '2025-02-05', value: 2.90 },
      { date: '2025-03-12', value: 2.65 },
      { date: '2025-04-23', value: 2.40 },
      { date: '2025-06-11', value: 2.15 }
    ];
    const depositChanges = [
      { date: '1999-01-01', value: 2.00 },
      { date: '1999-04-01', value: 1.50 },
      { date: '1999-11-01', value: 1.00 },
      { date: '2000-02-01', value: 2.00 },
      { date: '2001-05-01', value: 3.75 },
      { date: '2001-09-01', value: 3.25 },
      { date: '2001-11-01', value: 2.75 },
      { date: '2002-12-01', value: 1.75 },
      { date: '2003-06-01', value: 1.00 },
      { date: '2005-12-01', value: 1.25 },
      { date: '2006-03-01', value: 1.50 },
      { date: '2006-06-01', value: 1.75 },
      { date: '2006-08-01', value: 2.00 },
      { date: '2006-10-01', value: 2.25 },
      { date: '2006-12-01', value: 2.50 },
      { date: '2007-03-01', value: 2.75 },
      { date: '2007-06-01', value: 3.00 },
      { date: '2008-07-01', value: 3.25 },
      { date: '2008-10-01', value: 2.75 },
      { date: '2008-11-01', value: 2.25 },
      { date: '2008-12-01', value: 2.00 },
      { date: '2009-01-01', value: 1.50 },
      { date: '2009-03-01', value: 1.00 },
      { date: '2009-04-01', value: 0.75 },
      { date: '2009-05-01', value: 0.50 },
      { date: '2011-04-01', value: 0.75 },
      { date: '2011-07-01', value: 1.00 },
      { date: '2011-11-01', value: 0.75 },
      { date: '2011-12-01', value: 0.50 },
      { date: '2012-07-01', value: 0.25 },
      { date: '2013-05-01', value: 0.00 },
      { date: '2014-09-01', value: -0.10 },
      { date: '2015-12-01', value: -0.30 },
      { date: '2016-03-01', value: -0.40 },
      { date: '2019-09-01', value: -0.50 },
      { date: '2022-07-01', value: 0.00 },
      { date: '2022-09-01', value: 0.75 },
      { date: '2022-10-01', value: 1.50 },
      { date: '2022-11-01', value: 2.00 },
      { date: '2023-02-01', value: 2.50 },
      { date: '2023-03-01', value: 3.00 },
      { date: '2023-04-01', value: 3.25 },
      { date: '2023-05-01', value: 3.75 },
      { date: '2023-06-01', value: 4.00 },
      { date: '2024-01-01', value: 4.00 },
      { date: '2024-09-18', value: 3.50 },
      { date: '2024-10-23', value: 3.25 },
      { date: '2024-12-18', value: 3.00 },
      { date: '2025-02-05', value: 2.75 },
      { date: '2025-03-12', value: 2.50 },
      { date: '2025-04-23', value: 2.25 },
      { date: '2025-06-11', value: 2.00 }
    ];
    const lendingChanges = [
      { date: '1999-01-01', value: 4.50 },
      { date: '1999-04-01', value: 4.00 },
      { date: '1999-11-01', value: 3.00 },
      { date: '2000-02-01', value: 4.50 },
      { date: '2001-05-01', value: 5.50 },
      { date: '2001-09-01', value: 5.25 },
      { date: '2001-11-01', value: 4.75 },
      { date: '2002-12-01', value: 3.75 },
      { date: '2003-06-01', value: 3.00 },
      { date: '2005-12-01', value: 3.25 },
      { date: '2006-03-01', value: 3.50 },
      { date: '2006-06-01', value: 3.75 },
      { date: '2006-08-01', value: 4.00 },
      { date: '2006-10-01', value: 4.25 },
      { date: '2006-12-01', value: 4.50 },
      { date: '2007-03-01', value: 4.75 },
      { date: '2007-06-01', value: 5.00 },
      { date: '2008-07-01', value: 5.25 },
      { date: '2008-10-01', value: 4.75 },
      { date: '2008-11-01', value: 4.25 },
      { date: '2008-12-01', value: 3.25 },
      { date: '2009-01-01', value: 2.75 },
      { date: '2009-03-01', value: 2.50 },
      { date: '2009-04-01', value: 2.25 },
      { date: '2009-05-01', value: 2.00 },
      { date: '2011-04-01', value: 2.00 },
      { date: '2011-07-01', value: 2.25 },
      { date: '2011-11-01', value: 2.00 },
      { date: '2011-12-01', value: 1.75 },
      { date: '2012-07-01', value: 1.50 },
      { date: '2013-05-01', value: 1.00 },
      { date: '2014-09-01', value: 0.30 },
      { date: '2015-12-01', value: 0.30 },
      { date: '2016-03-01', value: 0.25 },
      { date: '2019-09-01', value: 0.25 },
      { date: '2022-07-01', value: 0.75 },
      { date: '2022-09-01', value: 1.50 },
      { date: '2022-10-01', value: 2.25 },
      { date: '2022-11-01', value: 2.75 },
      { date: '2023-02-01', value: 3.25 },
      { date: '2023-03-01', value: 3.50 },
      { date: '2023-04-01', value: 4.00 },
      { date: '2023-05-01', value: 4.25 },
      { date: '2023-06-01', value: 4.50 },
      { date: '2023-09-01', value: 4.50 },
      { date: '2024-01-01', value: 4.50 },
      { date: '2024-09-18', value: 3.90 },
      { date: '2024-10-23', value: 3.65 },
      { date: '2024-12-18', value: 3.40 },
      { date: '2025-02-05', value: 3.15 },
      { date: '2025-03-12', value: 2.90 },
      { date: '2025-04-23', value: 2.65 },
      { date: '2025-06-11', value: 2.40 }
    ];
    return {
      refi: {
        label: 'Main Refinancing Rate',
        data: buildMonthlyArray(refiChanges, 1999, 2025)
      },
      deposit: {
        label: 'Deposit Facility Rate',
        data: buildMonthlyArray(depositChanges, 1999, 2025)
      },
      lending: {
        label: 'Marginal Lending Rate',
        data: buildMonthlyArray(lendingChanges, 1999, 2025)
      }
    };
  }

  // Fetch all ECB rates data
  async fetchAllRates() {
    const rateTypes = ['refi', 'deposit', 'lending'];
    const promises = rateTypes.map(type => this.fetchECBData(type));
    
    try {
      const results = await Promise.all(promises);
      const data = {};
      
      rateTypes.forEach((type, index) => {
        data[type] = results[index] || this.getFallbackData()[type];
      });
      
      return data;
    } catch (error) {
      console.error('Failed to fetch ECB data:', error);
      return this.getFallbackData();
    }
  }

  // Get current rates (latest values)
  async getCurrentRates() {
    const data = await this.fetchAllRates();
    const currentRates = {};
    
    Object.keys(data).forEach(type => {
      const latestData = data[type].data[data[type].data.length - 1];
      const latestValue = latestData.values[latestData.values.length - 1];
      const trend = this.calculateTrend(data[type].data);
      currentRates[type] = {
        value: latestValue,
        trend: trend,
        lastUpdate: new Date().toISOString().split('T')[0]
      };
    });
    
    return currentRates;
  }

  // Calculate trend by comparing most recent rate with previous rate
  calculateTrend(yearlyData) {
    if (yearlyData.length < 1) return '↔ No change';
    
    const currentYear = yearlyData[yearlyData.length - 1];
    const currentRate = currentYear.values[currentYear.values.length - 1];
    
    // Find the previous rate by looking at the last non-null value before current
    let previousRate = null;
    
    // Look through the current year's data to find the previous rate
    for (let i = currentYear.values.length - 2; i >= 0; i--) {
      if (currentYear.values[i] !== null && currentYear.values[i] !== undefined) {
        previousRate = currentYear.values[i];
        break;
      }
    }
    
    // If no previous rate in current year, look at the previous year
    if (previousRate === null && yearlyData.length > 1) {
      const previousYear = yearlyData[yearlyData.length - 2];
      for (let i = previousYear.values.length - 1; i >= 0; i--) {
        if (previousYear.values[i] !== null && previousYear.values[i] !== undefined) {
          previousRate = previousYear.values[i];
          break;
        }
      }
    }
    
    if (previousRate === null) return '↔ No change';
    
    const difference = currentRate - previousRate;
    
    if (difference > 0) return '↗ Increasing';
    if (difference < 0) return '↘ Decreasing';
    return '↔ No change';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ECBDataFetcher;
} 

// Create a global ecbData object using the fallback data in the format script.js expects
const ecbFetcher = new ECBDataFetcher();
window.ecbData = { refi: {}, deposit: {}, lending: {} };
const fallback = ecbFetcher.getFallbackData();
['refi', 'deposit', 'lending'].forEach(type => {
  fallback[type].data.forEach(yearObj => {
    const year = yearObj.year;
    if (!window.ecbData[type][year]) window.ecbData[type][year] = [];
    yearObj.values.forEach((value, mIdx) => {
      window.ecbData[type][year].push({
        date: year + '-' + String(mIdx + 1).padStart(2, '0'),
        value: value
      });
    });
  });
}); 