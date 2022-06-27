var table = ee.FeatureCollection("projects/earthengine-geouu/assets/MasterProjects/Frozen_lakes/data/StudyAreas");
var lakes = ee.FeatureCollection("projects/earthimages4unil/assets/PostDocProjects/Mathieu/FrozenLake/HydroLAKES")

var loi = lakes.filterBounds(table)
var size = loi.size().getInfo()

var lakeList = loi.toList(size)
var listOfFeatures = ee.List([])

for (var i = 0; i < size; i++) {
  var lake = ee.Feature(lakeList.get(i))
  
  var id = lake.get('Hylak_id')
  var lat = lake.get('Pour_lat')
  var lon = lake.get('Pour_long')
  var area = lake.get('Lake_area')
  var depth = lake.get('Depth_avg')
  var country = lake.get('Country')
  var elevation = lake.get('Elevation')

  var feature = ee.Feature(ee.Geometry.Point([lon, lat]), 
  {
    id:id,
    area:area,
    depth:depth,
    country:country,
    elevation:elevation
  })
  
  var listOfFeatures = listOfFeatures.add(feature) 
}

var lakeInfo = ee.FeatureCollection(listOfFeatures)
print(lakeInfo)

Export.table.toDrive({
  collection: lakeInfo,
  description:'lakeInformation',
  fileFormat: 'csv'
});

Map.addLayer(loi)
Map.addLayer(table)
