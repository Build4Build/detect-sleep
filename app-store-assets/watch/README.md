# Apple Watch App Store screenshots

This set contains five English Apple Watch screenshots at **422 × 514 px**, the accepted Apple Watch Ultra 3 size documented by Apple. Every final PNG is opaque sRGB without an alpha channel.

The UI uses fictional sample data and depicts only shipped behavior:

1. Latest recorded sleep duration and stage summary.
2. Core, Deep, and REM stages read from Apple Health.
3. Optional HRV and resting-heart-rate wellness context, explicitly non-diagnostic.
4. User-initiated Apple Health permission.
5. On-demand refresh without a continuous workout or always-on sensor loop.

Regenerate the set with:

```sh
./app-store-assets/watch/generate-watch-screenshots.sh
```

The generated background was produced with the built-in image-generation tool using this prompt:

> Create a luxurious abstract portrait background inspired by restful sleep, with deep midnight navy flowing into royal indigo and violet, a soft cyan aurora ribbon, subtle concentric sleep-wave arcs, and tiny diffused stars. Keep darker space at the bottom and clear negative space at the top. Background only: no device, UI, copy, logos, icons, people, or watermark.

Apple references:

- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications)
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
