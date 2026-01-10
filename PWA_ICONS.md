# PWA Icon Setup

The app now requires PWA icons. You have two options:

## Option 1: Use the provided SVG placeholders
The SVG files in `/public` (icon-192.svg and icon-512.svg) can be used temporarily, but you should convert them to PNG format for better compatibility:

```bash
# Using any SVG to PNG converter or online tool
# Convert icon-192.svg to icon-192.png
# Convert icon-512.svg to icon-512.png
```

## Option 2: Create custom icons
Create your own PNG icons with these specifications:
- **icon-192.png**: 192x192 pixels
- **icon-512.png**: 512x512 pixels

Place both PNG files in the `/public` directory.

## Design Guidelines
- Use a simple, recognizable design
- Ensure the icon works on both light and dark backgrounds
- Follow the safe zone guidelines (keep important elements 10% away from edges)
- Test the icon at different sizes

Once you have the PNG files, the manifest.json will automatically reference them.
