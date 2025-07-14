
A map shows a single point for each camera. Multisensor/360-degree cameras are counted once per lens, which is consistent with how Chicopee PD records them in their audit logs and on their website. In preparing this story, I observed the following increases in the number of listed cameras on connectchicopee.org:

Timestamp,URL,Registered Cameras,Integrated Cameras
2025-07-09 15:55:06,https://connectchicopee.org/,56,476
2025-07-13 19:29:43,https://connectchicopee.org/,66,476

"Registered" cameras, along with body and dash cameras, are not counted on this map. It is unclear if this explains the difference in the numbers.

Camera locations are approximate, based on a combination of in-person observations and public records. To get GPS coordinates, known or presumed camera addresses were geocoded using an API service. In most cases, this location was taken from the ```location_name``` in Axon Fusus audit logs. 

Those logs are available in their original format at the [Internet Archive](https://archive.org/details/fusus-audit-export-live-view-may-june-2025). Data as it appears in the map is available in this github directory as [geojson files](https://github.com/JonGerhardson/JonGerhardson.github.io/blob/main/irene/camera_map_points.geojson) under a Creative Commons License, CC 4.0 International NC-BY-SA. 

In one specific case, Szot Park, cameras are spread across a large area represented by a single address. Multiple points were added semi-randomly within that zone after an in-person observation. This was done to show the distribution of cameras but does not necessarily map any particular camera to its exact GPS coordinates. For example, the bathhouse camera may appear in the football field. Other locations were updated if an ```object_name``` corresponded to a known address.

Median income data is derived from the 2023 ACS Five-Year Estimates Data Profiles for Hampden County, Massachusetts, specifically tables DP03 and DP05 from census.gov.

This information is presented as-is for educational purposes only and is provided without warranty. See the License for details.

If you would like to submit a correction or update, please email **jon.gerhardson at proton.me**
