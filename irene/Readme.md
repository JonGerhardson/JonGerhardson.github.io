The map in this directory was made using publicly avaialable information. It is a best-effort but may not be complete. It is based on records from January 1 to June 29, 2025. It shows 369 unique items extracted from audit logs for the Chicopee Police Department's use of Axon Fusus software. 


A map shows a single point for each camera. Multisensor/360-degree cameras are counted once per lens, which is consistent with how Chicopee PD records them in their audit logs and on their website. In preparing this story, I observed the following increases in the number of listed cameras on connectchicopee.org.
```
Timestamp,URL,Registered Cameras,Integrated Cameras
2025-07-09 15:55:06,https://connectchicopee.org/,56,476
2025-07-13 19:29:43,https://connectchicopee.org/,66,476
```
(I made a little gizmo that lets you keep track yourself see this [repo](https://github.com/JonGerhardson/axon-fusus-analysis-tools/tree/main/connect-counter).
 
"Registered" cameras, along with body and dash cameras, are not counted on this map. Neither are logs of views for recorded camera footage, only live views are included. Several hundred rows of data from the Live View logs were ommited due to missing timestamps that neither Axon or Chicopee PD could explain. 

Camera locations are approximate, based on a combination of in-person observations and public records. To get GPS coordinates, known or presumed camera addresses were geocoded using an API service. In most cases, this location was taken from the ```location_name``` in Axon Fusus audit logs. 

Those logs are available in their original format at the [Internet Archive](https://archive.org/details/fusus-audit-export-live-view-may-june-2025). Data as it appears in the map is available in this github directory as [geojson files](/irene/camera_map_points.geojson) under a Creative Commons License, CC 4.0 International NC-BY-SA. 

In one specific case, Szot Park, cameras are spread across a large area represented by a single address. Multiple points were added semi-randomly within that zone after in-person observation. This was done to more accurately show the distribution of cameras across the city, but does not necessarily map any particular camera to its exact GPS coordinates. For example, the bathhouse camera may appear in the football field. This applies to cameras with an object name containing "Szot" only. Other locations were updated if an ```object_name``` corresponded to a known address, and are believed to be approximately accurate. 

Median income data is derived from the 2023 ACS Five-Year Estimates Data Profiles for Hampden County, Massachusetts, specifically tables DP03 and DP05 from census.gov.

Embedded video footage was obtained via public records request and was downscaled and converted from .mkv to .mp4 due to technical constraints. An ONVIF compatible metadata stream was not provided to me with the footage. The person appearing on a bicycle in said footage is the author of this map.

This information is presented as-is for educational purposes only and is provided without warranty. See the License for details.

If you would like to submit a correction or update, please email **jon.gerhardson at proton.me**
