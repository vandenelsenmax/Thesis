// define size study area
var size = 10e3*10e3 //meters

// Define size of study area and area Finland 
var poi_finland = ee.Geometry.Point([25.434222798647887,64.22775391798564])
var study_area_finland = geometry.buffer(ee.Number(size).sqrt().divide(2),1).bounds()

// study area canada
var poi_canada = ee.Geometry.Point([-110.39971924681545,54.509389613885645])
var study_area_canada = poi_canada.buffer(ee.Number(size).sqrt().divide(2),1).bounds()

// study area canada
var poi_russia = ee.Geometry.Point([79.72465151367187,64.27445341177283])
var study_area_russia = poi_russia.buffer(ee.Number(size).sqrt().divide(2),1).bounds()

// study area alaska 
var poi_alaska = ee.Geometry.Point([-158.91763989356934,60.463605486161505])
var study_area_alaska = poi_alaska.buffer(ee.Number(size).sqrt().divide(2),1).bounds()


var study_areas = ee.FeatureCollection([
  ee.Feature(study_area_finland, {name:'Finland'}),
  ee.Feature(study_area_canada, {name:'Canada'}),
  ee.Feature(study_area_russia, {name:'Russia'}),
  ee.Feature(study_area_alaska, {name:'Alaska'})
  ])

Map.addLayer(study_areas)
print(study_areas)

// // // Export an ee.FeatureCollection as an Earth Engine asset.
Export.table.toAsset({
  collection: study_areas,
  description:'StudyAreas',
  assetId: 'MasterProjects/Frozen_lakes/StudyAreas',
});
