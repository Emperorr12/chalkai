---
name: Stripe subscription payments
description: Freemium paywall with Pro ($9/mo) and Scholar ($19/mo) tiers via Stripe Checkout
type: feature
---
- Pro: prod_UGQs6sZAQvQaPb / price_1THu10A2HxI9W9QxIDehoQpm ($9/mo)
- Scholar: prod_UGQtuvygMOoZAJ / price_1THu1KA2HxI9W9QxO4BDmnn7 ($19/mo)
- Edge functions: create-checkout, check-subscription, customer-portal
- Hook: useSubscription() returns isPro, tier, startCheckout, openPortal
- Free tier: 5 questions/day tracked in localStorage
- Pro users bypass daily limit
- Checkout success redirects to /ask?checkout=success → celebration
