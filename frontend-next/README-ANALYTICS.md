# Analytics Configuration Guide

This document explains how to configure the multi-provider analytics system for SarkariExams.me.

## Supported Providers

The application supports three analytics providers simultaneously:
- **Google Analytics 4 (GA4)** - Comprehensive web analytics
- **Plausible Analytics** - Privacy-focused, lightweight analytics
- **Mixpanel** - Advanced user behavior tracking

## Environment Variables

Create a `.env.local` file in the `frontend-next` directory with the following variables:

```env
# Enable/Disable Analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Google Analytics 4
NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX

# Plausible Analytics
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=sarkariexams.me

# Mixpanel
NEXT_PUBLIC_MIXPANEL_TOKEN=xxxxxxxxxxxxx
```

## Setup Instructions

### Google Analytics 4

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property
3. Get your Measurement ID (format: `G-XXXXXXXXXX`)
4. Add to `.env.local`: `NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX`

### Plausible Analytics

1. Sign up at [Plausible.io](https://plausible.io/)
2. Add your domain (e.g., `sarkariexams.me`)
3. Add to `.env.local`: `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=sarkariexams.me`

### Mixpanel

1. Sign up at [Mixpanel](https://mixpanel.com/)
2. Create a new project
3. Get your Project Token from Settings
4. Add to `.env.local`: `NEXT_PUBLIC_MIXPANEL_TOKEN=xxxxxxxxxxxxx`

## Enabling/Disabling Providers

Each provider can be independently enabled or disabled:

- **To enable a provider**: Add its environment variable
- **To disable a provider**: Remove or comment out its environment variable
- **To disable all analytics**: Set `NEXT_PUBLIC_ENABLE_ANALYTICS=false`

## Tracked Events

The following events are automatically tracked across all enabled providers:

### Page Views
- Homepage visits
- Job detail views
- Category page views
- Search result views

### User Interactions
- **Search**: `search_query`, `search_suggestion_click`
- **Filters**: `filter_apply`, `filter_reset`, `chip_click`
- **Bookmarks**: `bookmark_add`, `bookmark_remove`
- **CTAs**: `cta_click`, `link_click`, `sticky_cta_click`
- **Navigation**: `detail_view`, `print_page`, `report_issue`

### User Authentication
- User login
- User registration
- User logout

## Privacy & GDPR Compliance

### Cookie Consent

The analytics system respects user privacy:

- **GA4**: Requires cookie consent (implement consent banner)
- **Plausible**: No cookies, GDPR compliant by default
- **Mixpanel**: Uses localStorage, consider consent for EU users

### Recommended Implementation

For GDPR compliance, implement a cookie consent banner before initializing GA4 and Mixpanel:

```typescript
// Only initialize after user consent
if (userHasConsented) {
    initializeAnalytics();
}
```

## Testing Analytics

### Development Mode

In development, analytics events are logged to the console:

```javascript
console.log('[Analytics]', event, data);
```

### Production Testing

1. Set `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
2. Add at least one provider's credentials
3. Build and run: `npm run build && npm start`
4. Open browser DevTools → Network tab
5. Look for requests to:
   - GA4: `google-analytics.com/g/collect`
   - Plausible: `plausible.io/api/event`
   - Mixpanel: `api.mixpanel.com/track`

## Troubleshooting

### Analytics Not Working

1. **Check environment variables**: Ensure `.env.local` exists and variables are prefixed with `NEXT_PUBLIC_`
2. **Rebuild the app**: Environment variables are embedded at build time
3. **Check browser console**: Look for initialization messages
4. **Verify provider status**: Check `analytics.getProviders()` in console

### Events Not Tracking

1. **Check initialization**: Run `analytics.isInitialized()` in browser console
2. **Verify provider scripts**: Check Network tab for script loading
3. **Check ad blockers**: Some ad blockers block analytics scripts
4. **Review CSP headers**: Ensure Content Security Policy allows analytics domains

## API Reference

### Track Custom Events

```typescript
import { trackEvent } from '@/app/lib/analytics';

// Track a simple event
trackEvent('button_click');

// Track with data
trackEvent('job_apply', {
    jobId: '123',
    jobTitle: 'Software Engineer',
    organization: 'UPSC'
});
```

### Track Page Views

```typescript
import { trackPageView } from '@/app/lib/analytics';

trackPageView('/jobs/software-engineer', 'Software Engineer Job');
```

### Set User Identity

```typescript
import { setUser, clearUser } from '@/app/lib/analytics';

// After login
setUser('user123', {
    email: 'user@example.com',
    role: 'premium'
});

// After logout
clearUser();
```

## Performance Impact

The analytics system is optimized for minimal performance impact:

- **Lazy Loading**: Scripts load asynchronously
- **No Blocking**: Analytics never blocks page rendering
- **Error Handling**: Failed analytics calls don't affect app functionality
- **Bundle Size**: ~15KB total (all three providers)

## Data Retention

Configure data retention in each provider's dashboard:

- **GA4**: Settings → Data Settings → Data Retention
- **Plausible**: Retains data indefinitely by default
- **Mixpanel**: Project Settings → Data Retention

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Verify environment variables
4. Check provider dashboards for data

## Migration Notes

### From Previous Analytics

If migrating from a previous analytics setup:

1. Remove old analytics code
2. Install new system (already done)
3. Configure environment variables
4. Test in development
5. Deploy to production
6. Verify data in provider dashboards

### Backward Compatibility

The new system is backward compatible with existing `trackEvent()` calls throughout the codebase. No code changes needed in components.
