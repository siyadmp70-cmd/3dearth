# Earth map assets

The renderer looks in these subfolders for optional equirectangular maps. Missing maps fall back to a lightweight generated preview, so the scene stays available offline.

Expected files:

- `orbital/earth_day.jpg` — diffuse day surface
- `orbital/earth_night.jpg` — night lights
- `orbital/earth_normal.jpg` — subtle terrain normals
- `orbital/earth_specular.jpg` — ocean specular mask
- `clouds/earth_clouds.png` — cloud mask with alpha

The recommended public-domain day map is NASA Earth Observatory's Blue Marble: Next Generation January 2004 global map (2 km/pixel):

https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/january/world.200401.3x5400x2700.jpg

NASA asks users to credit “NASA Earth Observatory.” Project overview and map downloads: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/

The map could not be copied into this workspace because the local environment refused the NASA asset download. Put the equirectangular JPEG at `orbital/earth_day.jpg` to enable the high-resolution photographic surface; the existing WebGL scene will load it automatically.
