# Spicy Restaurant

A static website for Spicy Restaurant near Banikhet, Himachal Pradesh. The site highlights kadhi rice and rajma rice and links visitors to the restaurant’s location, phone, and Google Maps listing.

## Preview locally

```sh
python3 -m http.server 8765
```

Open http://localhost:8765. The site uses plain HTML and CSS and has no build step.

## GitHub Pages

In the repository’s **Settings → Pages**, choose **Deploy from a branch** and publish from **main / (root)**. Future pushes to `main` update the site.

## Content sources

- The [Google Maps listing](https://www.google.com/maps?cid=849003724971903692) supplies the address, business hours, phone number, and attributed five-star review excerpts.
- The kadhi rice and rajma rice images were generated with ImageGen and are labeled as illustrations on the site. Replace the two JPEGs and the image labels if current restaurant photos become available.
- The storefront photo was supplied by the restaurant. Menu items and prices were transcribed from its printed menu.
