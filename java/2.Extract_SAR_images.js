var sar = ee.ImageCollection("COPERNICUS/S1_GRD"),
    studyAreas = ee.FeatureCollection("projects/earthengine-geouu/assets/MasterProjects/Frozen_lakes/data/StudyAreas"),
    geometry = /* color: #d63000 */ee.Geometry.MultiPoint(),
    lakesPoly = ee.FeatureCollection("projects/earthimages4unil/assets/PostDocProjects/Mathieu/FrozenLake/HydroLAKES"),
    Binary = ee.ImageCollection("projects/earthengine-geouu/assets/MasterProjects/Frozen_lakes/data/BinStudyArea"),
    wind = ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY");

// Set visualisation parameters
var ColorVisu={bands:['B3','B2','B1'], min:0, max:4000};
var ColorVisu2={bands:['B3','B2','B1'], min:3000, max:9000};
var BinVisu={min:0, max:1};
var SARVisu={bands:['VV'], min:-30, max:-5};

var sar = sar.filter(ee.Filter.eq('instrumentMode', 'IW'))
          .filter(ee.Filter.eq('resolution_meters', 10))
          .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))


// define study area of interest 
var country = 'Finland'
var aoi = studyAreas.filter(ee.Filter.eq('name', country))

var collection = studyAreas.map(function(f) {
  return f.set('geo_type', f.geometry().type())
})

var area = (collection.filter(ee.Filter.eq('name', country)))

// Show binary layer for study area
var binName = 'projects/earthengine-geouu/assets/MasterProjects/Frozen_lakes/data/BinaryStudyArea/'
var areabin = ee.Image(ee.String(binName).cat(country).getInfo())

var polygonCentroid = ee.Geometry.Polygon(area.geometry().coordinates()).centroid({'maxError': 1});
Map.setCenter(ee.Number(polygonCentroid.coordinates().get(0)).getInfo(), 
              ee.Number(polygonCentroid.coordinates().get(1)).getInfo(), 12);


// Select lakes in area of interest
var loi = lakesPoly.filterBounds(aoi)
Map.addLayer(loi)
// Define periods of water/ice
// Water dates
var dates = require('users/vandenelsenmax/Thesis:sarPrep/ImportStateDates')

var startDateWater = dates.startDateWaterFin
var endDateWater = dates.endDateWaterFin
var startDateIce = dates.startDateIceFin
var endDateIce = dates.endDateIceFin

// Wind
var windsa = wind
            .select(['u_component_of_wind_10m', 'v_component_of_wind_10m'])
            .map(function(f){return f.clip(aoi)})

/////////////////////////////////////////////////////////////////////////////
  
//////////////// GET IMAGE COLLECTION OF DEFINED ICE PERIODS //////////////// 
var totalIce = ee.ImageCollection([])
 
for(var i = 0; i < 5; i++){
  var startDate = startDateIce.get(i)
  var endDate = endDateIce.get(i)
  
  var sar1 = sar
          .filterBounds(aoi)
          .filterDate(startDate, endDate)

  var totalIce = sar1.merge(totalIce)     
  var numberIce = ee.Number(totalIce.size())
}

var totalIce = totalIce.map(function(f){
  return f.set('dates', ee.Date(f.get('system:time_start')).format('YYYY-MM-dd'))})

var totalIce = totalIce.map(function(f){
  return f.clip(aoi)
})


///////////////////////////////////////////////////////////////////////////////

//////////////// GET IMAGE COLLECTION OF DEFINED WATER PERIODS //////////////// 
var totalWater = ee.ImageCollection([])

for(var i = 0; i < 5; i++){
  var startDate = startDateWater.get(i)
  var endDate = endDateWater.get(i)
  
  var sar1 = sar
          .filterBounds(aoi)
          .filterDate(startDate, endDate)

  var totalWater = sar1.merge(totalWater)     
  var numberWater = ee.Number(totalWater.size())
}

var totalWater = totalWater.map(function(f){
  return f.set('dates', ee.Date(f.get('system:time_start')).format('YYYY-MM-dd'))})

var totalWater = totalWater.map(function(f){
  return f.clip(aoi)
})

///////////////////////////////////////////////////////////////////////////////

//////////////// INSPECT DATE OF IMAGE COLLECTION //////////////// 
// Get list of dates 
var dateListIce = ee.List(totalIce.aggregate_array('dates'))
var dateListWater = ee.List(totalWater.aggregate_array('dates'))

// // Print all information
print('total available Water images', country, ': ' ,numberWater)
print('Unique dates in imagecollection Water', country, ': ', dateListWater.distinct().size())
print('total available Ice images', country, ': ' ,numberIce)
print('Unique dates in imagecollection Ice', country, ': ', dateListIce.distinct().size())

///////////////////////////////////////////////////////////////

//////////////// CREATE ICE LABLED MOSAIC IMAGE COLLECTION //////////////// 

var dateListIceUni = (dateListIce.distinct())
var SARicIce = ee.ImageCollection([])
var n = ee.Number(dateListIceUni.size()).getInfo()

for (var i = 0; i < n; i++){
  var day = dateListIceUni.get(i)
  var daystart = ee.String(day).cat('T00:00:01')
  var dayend = ee.String(day).cat('T23:59:59')
  
  var BinaryLake = Binary.filterBounds(aoi).first().rename('lake')
  var BinaryIce = Binary.filterBounds(aoi).first().rename('ice')
          
  var SARimg = totalIce.filterDate(daystart, dayend)
  var mosaicSAR = SARimg.mosaic()
  var mosaicSAR = mosaicSAR.addBands(BinaryIce).addBands(BinaryLake).toFloat()

  var timestamp = ee.Date(SARimg.first().get('system:time_start'))
  
  var winduv = windsa
              .filterDate(timestamp, dayend)
              .first()
              
  var mosaicSAR = mosaicSAR.addBands(winduv.select('u_component_of_wind_10m').rename('windU')).toFloat()
  var mosaicSAR = mosaicSAR.addBands(winduv.select('v_component_of_wind_10m').rename('windV')).toFloat()
  
  var vv = ee.Image(mosaicSAR.select('VV').multiply(10).toInt())
  var glcm = vv.glcmTexture({size: 4});
  
  var contrast = glcm.select('VV_contrast').toFloat().rename('cont')
  var corr = glcm.select('VV_corr').toFloat().rename('corr')
  var entropy = glcm.select('VV_ent').toFloat().rename('ent')

  var newBands = ee.Image([contrast, corr, entropy])
  var mosaicSAR = mosaicSAR.addBands(newBands)
  
  var mosaicSAR = mosaicSAR
              .set({date:timestamp,
                id:i.toString(),
                Country:country,
                state: 'Ice'
              })
  var mosaicSAR = ee.ImageCollection.fromImages([mosaicSAR])
  var SARicIce = SARicIce.merge(mosaicSAR) 
}

print(SARicIce)

///////////////////////////////////////////////////////////////

//////////////// CREATE WATER LABLED MOSAIC IMAGE COLLECTION //////////////// 

var dateListWaterUni = (dateListWater.distinct())
var SARicWater = ee.ImageCollection([])
var n = ee.Number(dateListWaterUni.size()).getInfo()

for (var i = 0; i < n; i++){
  var day = dateListWaterUni.get(i)
  var daystart = ee.String(day).cat('T00:00:01')
  var dayend = ee.String(day).cat('T23:59:59')
  
  var BinaryLake = Binary.filterBounds(aoi).first().rename('lake')
  var BinaryIce = ee.Image.constant(0).rename('ice').clip(aoi)

  var SARimg = totalWater.filterDate(daystart, dayend)
  var mosaicSAR = SARimg.mosaic()//.reproject('EPSG:32612', null, 10);
  var mosaicSAR = mosaicSAR.addBands(BinaryIce).addBands(BinaryLake).toFloat()
  
  var timestamp = ee.Date(SARimg.first().get('system:time_start'))
  
  var winduv = windsa
              .filterDate(timestamp, dayend)
              .first()
              
  var mosaicSAR = mosaicSAR.addBands(winduv.select('u_component_of_wind_10m').rename('windU')).toFloat()
  var mosaicSAR = mosaicSAR.addBands(winduv.select('v_component_of_wind_10m').rename('windV')).toFloat()
  
  var vv = ee.Image(mosaicSAR.select('VV').multiply(10).toInt())
  var glcm = vv.glcmTexture({size: 4});
  
  var contrast = glcm.select('VV_contrast').toFloat().rename('cont')
  var corr = glcm.select('VV_corr').toFloat().rename('corr')
  var entropy = glcm.select('VV_ent').toFloat().rename('ent')

  var newBands = ee.Image([contrast, corr, entropy])
  var mosaicSAR = mosaicSAR.addBands(newBands)
  
  var mosaicSAR = mosaicSAR
              .set({date:timestamp,
                id:i.toString(),
                Country:country,
                state: 'Water'
              })

  var mosaicSAR = ee.ImageCollection.fromImages([mosaicSAR])
  var SARicWater = SARicWater.merge(mosaicSAR)
}
///////////////////////////////////////////////////////////////
print(SARicWater)

////////////// VISUAL INSPECTION OF SAR DATA //////////////// 

// Add layer in for loop
var n = SARicWater.size().getInfo()
for(i=201; i <= 205; i++){
  var im = ee.Image(SARicWater.toList(n).get(i))
  var id = im.getString('id').getInfo()
  Map.addLayer(im, SARvisu, null, false)
}


// //////////////// EXPORT IMAGES TO BUCKET //////////////// 

// Set image collection to variable that will export
var exportData = SARicWater
                .map(function(f){return f.clip(loi)})
//var exportData = SARicWater.merge(SARicIce)

// Export to assets
var size = exportData.size().getInfo()
var listOfImage = exportData.toList(25, 252)

for (var i = 0; i < size; i++) {
    var img = ee.Image(listOfImage.get(i));
    var date = ee.Date(img.get('date')).format('YYMMdd').getInfo()
    var id = img.getString('id').getInfo()
    var state = img.getString('state').getInfo()
    var nam = country + state + '_' + id + '_' + date
    var prefix = 'SarExportLakeImgs/' + nam


    Export.image.toCloudStorage({
      image: img,
      description: nam,
      bucket: 'frozen-lake-ee',
      fileNamePrefix: prefix,
      region: aoi,
      crs: 'EPSG:3857',
      dimensions:2000
    });
  }


////////////// CREATE FEATURE COLLECTION WIHT LON LAT INFORMATION //////////////// 
var listOfFeatures = ee.List([])

for (var i = 0; i < size; i++) {
  var img = ee.Image(listOfImage.get(i));
  var lonlat = aoi.first().geometry().centroid()

  var date = ee.Date(img.get('date'))
  var id = img.get('id')
  var state = img.get('state')

  var feature = ee.Feature(lonlat, 
  {Date:date,
    imgID:id,
    state: state,
    country:country,
    lon: ee.Number(lonlat.coordinates().get(0)),
    lat: ee.Number(lonlat.coordinates().get(1))
  })
  
  var listOfFeatures = listOfFeatures.add(feature) 
}

var features = ee.FeatureCollection(listOfFeatures)
var nam = 'features' + '_' + country
var prefix = 'SarExport/' + nam


Export.table.toCloudStorage({
  collection: features,
  description: nam,
  fileFormat: 'csv',
  bucket: 'frozen-lake-ee',
  fileNamePrefix: prefix,
})
