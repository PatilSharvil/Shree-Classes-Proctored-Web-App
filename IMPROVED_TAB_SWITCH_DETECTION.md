# Improved Tab Switch Detection System

## Overview
Enhanced the tab switch detection system to work effectively for both **mobile** and **desktop** users, with device-specific thresholds, cooldown periods, and decay mechanisms to prevent false positives while maintaining exam integrity.

---

## Key Improvements

### 1. **Device-Aware Detection**
The system now automatically detects the device type and applies appropriate settings:

#### Desktop Users
- **Tab Switch Threshold**: 5 violations (default)
- **Looking Away Threshold**: 5 violations (default)
- **Violation Cooldown**: 3 seconds
- **Violation Decay**: 2 minutes

#### Mobile Users
- **Tab Switch Threshold**: 8 violations (more lenient)
- **Looking Away Threshold**: 10 violations (more lenient)
- **Violation Cooldown**: 5 seconds
- **Violation Decay**: 2 minutes

**Why more lenient on mobile?**
- Mobile browsers fire `visibilitychange` more frequently (notifications, screen lock, app switches)
- Mobile users may accidentally switch apps or receive system notifications
- Provides fairer experience for mobile exam takers

---

### 2. **Cooldown Mechanism**
Prevents rapid-fire violations from stacking up too quickly:

- **Desktop**: 3-second cooldown between violations
- **Mobile**: 5-second cooldown between violations
- Logs skipped violations during cooldown: `[Proctoring] Skipping violation - still in cooldown period`
- Prevents accidental rapid submissions due to system events

**Example**: If a desktop user switches tabs 3 times in 2 seconds, only the first violation is recorded. The next violations are ignored until the 3-second cooldown expires.

---

### 3. **Violation Decay System**
Old violations lose weight over time:

- **Decay Window**: 2 minutes (120,000ms)
- Tab switch timestamps older than 2 minutes are removed
- Looking away count gradually decreases if no new violations occur
- Prevents accumulation of old violations from affecting current behavior

**Example**: If a user has 3 tab switches in the first minute, then behaves well for 2 minutes, the old tab switch counts expire and won't trigger auto-submit.

---

### 4. **Mobile-Specific Event Handling**
Added dedicated mobile event listeners for more accurate detection:

#### New Events
- **`pagehide`**: Fires when mobile app is backgrounded (home button, app switch)
- **`pageshow`**: Fires when mobile app returns to foreground

#### Benefits
- More reliable than `visibilitychange` on mobile devices
- Properly handles mobile-specific scenarios (incoming calls, notifications)
- Detects actual app switches vs. temporary visibility changes

#### Violation Type
- Mobile app switches are recorded as `MOBILE_APP_SWITCH` (distinct from desktop `TAB_SWITCH`)
- Allows admins to see device-specific violation patterns

---

### 5. **Better Violation Tracking**
Separate and clear tracking for different violation types:

#### Counters
- `tabSwitchTimesRef`: Array of recent tab switch timestamps (within decay window)
- `lookingAwayCountRef`: Total count of all visibility violations
- `lastViolationTimeRef`: Timestamp of last violation (for cooldown)

#### Metadata
Each violation now includes:
- `device`: 'mobile' or 'desktop'
- `switchCount`: Current tab switch count
- `threshold`: Configured threshold
- `lookingAwayCount`: Current looking away count
- `lookingAwayThreshold`: Configured looking away threshold

---

## Configuration

### Default Values (Auto-Detected)

```javascript
const proctoring = useProctoring(sessionId, {
  // Device-aware thresholds
  tabSwitchThreshold: isMobile ? 8 : 5,
  lookingAwayThreshold: isMobile ? 10 : 5,
  
  // Cooldown period (ms)
  violationCooldownMs: isMobile ? 5000 : 3000,
  
  // Decay window (ms)
  violationDecayMs: 120000 // 2 minutes
});
```

### Custom Exam Configuration
Exam creators can override defaults in `CreateExamPage.jsx`:

```javascript
// Strict mode
tabSwitchThreshold: 3,
lookingAwayThreshold: 3,

// Normal mode
tabSwitchThreshold: 5,
lookingAwayThreshold: 5,

// Lenient mode
tabSwitchThreshold: 10,
lookingAwayThreshold: 10,
```

These custom values work with the device-aware system:
- Mobile users get the custom value (not doubled)
- Desktop users get the custom value as-is
- Cooldown and decay still apply based on device type

---

## Behavior Examples

### Desktop User - Tab Switch Scenario
1. **First tab switch**: Warning 1/5 shown, MEDIUM severity violation recorded
2. **Second tab switch** (within 3s): Skipped (cooldown active)
3. **Third tab switch** (after 3s): Warning 2/5 shown, MEDIUM severity
4. **Fourth tab switch**: Warning 3/5 shown, HIGH severity (rapid switching detected)
5. **Fifth tab switch**: Auto-submit triggered, CRITICAL severity

### Mobile User - App Switch Scenario
1. **First app switch**: Warning 1/8 shown, MEDIUM severity
2. **Second app switch** (within 5s): Skipped (cooldown active)
3. **Third app switch** (after 5s): Warning 2/8 shown, MEDIUM severity
4. **Fourth-Sixth app switches**: Warnings continue
5. **Eighth app switch**: Auto-submit triggered, CRITICAL severity

### Decay in Action
- User has 4 tab switches in first minute
- User behaves well for next 2 minutes
- Old tab switch timestamps expire
- Counter resets to 0
- User can continue exam without auto-submit

---

## Files Modified

### Frontend
1. **`frontend/src/hooks/useProctoring.js`**
   - Added `isMobileDevice` detection utility
   - Added device-aware default thresholds
   - Added `violationCooldownMs` and `violationDecayMs` configs
   - Added `lastViolationTimeRef` and `violationDecayTimerRef`
   - Added `isInCooldown()` helper function
   - Added `applyDecay()` helper function
   - Added `handlePageHide()` for mobile app switch detection
   - Added `handlePageShow()` for mobile app return detection
   - Updated `handleVisibilityChange()` to use cooldown and decay
   - Updated `handleWindowBlur()` to respect cooldown
   - Added mobile-specific event listeners
   - Added device metadata to all violation logs

2. **`frontend/src/pages/exam/ExamPage.jsx`**
   - Updated import to use `isMobileDevice` from useProctoring
   - Updated proctoring config with device-aware thresholds
   - Added `violationCooldownMs` and `violationDecayMs` parameters
   - Enhanced logging to show device type

---

## Testing Recommendations

### Desktop Testing
1. Start exam on desktop browser
2. Switch tabs 5 times within 2 minutes
3. Verify auto-submit triggers on 5th switch
4. Check that cooldown prevents rapid-fire violations

### Mobile Testing
1. Start exam on mobile browser (Chrome/Safari)
2. Switch to another app (WhatsApp, Messages, etc.)
3. Return to exam
4. Verify warning is shown with mobile-specific message
5. Repeat 8 times to trigger auto-submit
6. Check that 5-second cooldown prevents accidental rapid violations

### Decay Testing
1. Trigger 3-4 tab switches in first minute
2. Wait 2 minutes without switching
3. Trigger another tab switch
4. Verify counter has decayed (shouldn't trigger auto-submit)

---

## Admin Dashboard Impact

The admin dashboard will now show more detailed violation data:

### Violation Types
- `TAB_SWITCH`: Desktop tab switches
- `MOBILE_APP_SWITCH`: Mobile app switches
- `RAPID_TAB_SWITCH`: Rapid switching (3+ in decay window)
- `WINDOW_BLUR`: Focus loss (not hidden)
- `LOOKING_AWAY`: Looking away detection (AI-based)

### Metadata Fields
- `device`: 'mobile' or 'desktop'
- `switchCount`: Current count
- `threshold`: Configured threshold
- `lookingAwayCount`: Looking away count
- `lookingAwayThreshold`: Looking away threshold

This allows admins to:
- See if violations are from mobile or desktop users
- Identify patterns (e.g., mobile users triggering more violations)
- Adjust exam thresholds based on device distribution

---

## Backward Compatibility

✅ **Fully backward compatible**
- Existing exams continue to work with default thresholds
- Custom exam thresholds are respected
- Database schema unchanged
- API endpoints unchanged
- Only client-side behavior improved

---

## Performance Impact

- **Minimal overhead**: Only timestamps and counters tracked
- **Efficient decay**: Filters arrays every 30 seconds
- **Cooldown checks**: Simple timestamp comparison
- **No additional API calls**: Same violation recording logic
- **Mobile optimization**: Event listeners only added on mobile devices

---

## Future Enhancements

1. **Adaptive Thresholds**: Automatically adjust based on user behavior patterns
2. **Grace Period**: Allow 1-2 violations as warnings before counting
3. **Exam-Specific Decay**: Different decay windows per exam type
4. **Network Quality Detection**: Adjust thresholds based on connection stability
5. **Battery Saver Mode**: Detect low-power mode and adjust accordingly

---

## Troubleshooting

### Issue: Violations triggering too fast on mobile
**Solution**: The system already applies 5-second cooldown and higher thresholds (8 vs 5). If still too fast, increase `tabSwitchThreshold` in exam settings.

### Issue: Decay not working
**Solution**: Check that `violationDecayMs` is set (default: 120000ms). The decay runs every 30 seconds automatically.

### Issue: Mobile app switches not detected
**Solution**: Ensure browser supports `pagehide`/`pageshow` events (all modern browsers do). Check console for `[Proctoring]` logs.

### Issue: Cooldown too long/short
**Solution**: Adjust `violationCooldownMs` in exam config or modify defaults in `useProctoring.js` (line ~63).

---

## Summary

The improved tab switch detection system provides:
- ✅ **Device-aware thresholds** (mobile vs desktop)
- ✅ **Cooldown mechanism** (prevents rapid-fire violations)
- ✅ **Decay system** (old violations lose weight)
- ✅ **Mobile-specific detection** (pagehide/pageshow events)
- ✅ **Better violation metadata** (device type, counts, thresholds)
- ✅ **Backward compatibility** (existing exams work unchanged)

This ensures fair and accurate proctoring for both mobile and desktop users while maintaining exam integrity.
