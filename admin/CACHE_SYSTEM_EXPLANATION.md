# Smart Complaint Caching System

## Overview
This system minimizes Firestore reads by implementing a smart caching strategy for complaint counts.

## How It Works

### 1. **Cache Structure**
```json
{
  "lastQueryDate": "2025-11-10",
  "openCount": 150,
  "closedCount": 75,
  "cachedAt": "2025-11-11T10:30:00.000Z"
}
```
- Stored in localStorage with key: `complaintCache_{companyCode}`
- Contains historical counts up to yesterday

### 2. **Cache Strategy**

#### First Load (No Cache)
1. Query ALL historical complaints up to yesterday (one-time)
2. Query today's complaints
3. Save historical counts to localStorage
4. Display: Historical + Today's counts

#### Subsequent Loads (Cache Valid)
1. Check if cache exists and `lastQueryDate` is yesterday
2. If yes: Use cached historical counts (no Firestore reads!)
3. Only query today's complaints (minimal reads)
4. Display: Cached Historical + Fresh Today's counts

#### Daily Reset
- When date changes (new day):
  - Yesterday becomes part of historical data
  - Cache is refreshed with new query
  - Historical count updated once per day

### 3. **Firestore Reads Optimization**

**Without Caching:**
- Every page load: Query ALL complaints
- 100 page loads = 100 full database scans
- High Firestore costs

**With Caching:**
- Day 1: Query all complaints (one-time)
- Day 2-N: Only query today's complaints
- 100 page loads on same day = 1 historical query + 100 small queries
- **Up to 90% reduction in Firestore reads!**

### 4. **Dashboard Cards**

#### 📂 Total Open Complaints
- Shows: Historical Open + Today's Open
- Updates: Once per day for historical, real-time for today

#### ✅ Total Closed Complaints  
- Shows: Historical Closed + Today's Closed
- Updates: Once per day for historical, real-time for today

#### 🆕 Today's New Complaints
- Shows: Only today's open complaints
- Updates: Real-time on every page load

#### Cache Info
- Shows when cache was last updated
- Helps debug and verify cache status

### 5. **Manual Cache Control**

**Clear Cache Button (🗑️)**
- Clears localStorage cache
- Forces fresh query of all data
- Useful for:
  - Testing
  - Data verification
  - Fixing cache corruption

### 6. **Technical Implementation**

```javascript
// Cache Query Logic
if (cacheData && cacheData.lastQueryDate === yesterdayStr) {
    // Use cached data (no Firestore read)
    historicalCount = cacheData.openCount;
} else {
    // Query Firestore (only once per day)
    historicalCount = await queryHistoricalData();
    // Save to cache
    localStorage.setItem(cacheKey, JSON.stringify({...}));
}

// Always query today's data (minimal read)
todayCount = await queryTodayData();

// Display total
total = historicalCount + todayCount;
```

### 7. **Benefits**

✅ **Massive Cost Reduction**: Up to 90% fewer Firestore reads  
✅ **Faster Page Loads**: Instant display from cache  
✅ **Real-time Today's Data**: Always fresh current day info  
✅ **Automatic Management**: No manual intervention needed  
✅ **Per-Company Cache**: Separate cache for each company code

### 8. **Considerations**

⚠️ **Historical Data Accuracy**: Historical counts update once per day  
⚠️ **Browser Storage**: Uses localStorage (5-10MB limit)  
⚠️ **Manual Updates**: Use "Clear Cache" if historical data changes  
⚠️ **Time Zone**: Uses system time zone for date calculations

## Example Scenario

**Day 1 (Nov 10):**
- 10:00 AM: First load → Query all complaints (200 open, 100 closed)
- Cache saved: `lastQueryDate: "2025-11-09"`, `openCount: 200`, `closedCount: 100`
- 02:00 PM: Second load → Use cache (200, 100) + query today (5, 2)
- Display: 205 open, 102 closed
- **Firestore reads saved: ~200 reads**

**Day 2 (Nov 11):**
- 09:00 AM: First load → Cache invalid (date changed)
- Query historical up to Nov 10 → New cache: 205 open, 102 closed
- Query today Nov 11 → 3 open, 1 closed
- Display: 208 open, 103 closed

**Result:**
- Only 2 full queries across 2 days
- Subsequent loads use cache + minimal today queries
- Massive Firestore cost savings!

## Monitoring

Console logs show cache status:
```
✓ Using cached historical data from yesterday
📊 Querying today's complaints...
✓ Today's Open: 5, Today's Closed: 2
📈 TOTALS - Open: 205, Closed: 102
```

## Future Enhancements

- [ ] Add cache expiration time (not just date-based)
- [ ] Implement cache warming on login
- [ ] Add cache metrics dashboard
- [ ] Support for multi-status caching
- [ ] Background cache refresh

