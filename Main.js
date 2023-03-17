const map = new ol.Map({
  target: "map",
  view: new ol.View({
    center: [3500000, 3500000],
    zoom: 4,
  }),
  layers: [],
});

// ==================================== we make 3 basemap layers ====================================

const osmLayer = new ol.layer.Tile({
  source: new ol.source.OSM(),
  visible: true,
  layername: "osm",
});
const lightGrayMapLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}@2x.png",
  }),
  visible: false,
  layername: "light_gray_alidade",
});
const darkMapLayer = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png",
  }),
  visible: false,
  layername: "dark_alidade",
});

// ==================================== we add the 3 layers to the map layers  ====================================

map.addLayer(osmLayer);
map.addLayer(lightGrayMapLayer);
map.addLayer(darkMapLayer);

// ==================================== Now let's select all the input radiochecks ====================================

const switchList = document.querySelectorAll("input");

// ==================================== we add the 3 layers to a group so that we can loop on them to switch between them  ====================================

const basemapGroup = new ol.layer.Group({
  layers: [osmLayer, darkMapLayer, lightGrayMapLayer],
});

// ==================================== let's loop on the input and add an event listener on each one of them and we use an arrow function to do that ====================================

switchList.forEach((element) => {
  element.addEventListener("change", (e) => {
    const basemapname = element.id;

    // ==================================== now we loop on the group of basemaps and use the getlayer function to be able to get the arraylist and loop on them   ====================================

    basemapGroup.getLayers().forEach((layer) => {
      if (layer.get("layername") === basemapname) {
        layer.setVisible(true);
      } else {
        layer.setVisible(false);
      }
    });
  });
});

// ==================================== now let's add a cluster layer to represent temperature in cities ====================================

// ==================================== so that when we zoom out we get the highest temperature adn when we zoom in we get more detailed weather report ====================================

// ==================================== let's fetch the features from a local file fetch by default uses the GET method ====================================

fetch("./citiesWeather.json")
  .then((response) => response.json())
  .then((data) => {
    let cityasFeatures = createCityTempFeatures(data.cities);

    // ==================================== we add the features to a vector layer after we fetched the data from the json file and reshaped it into point features (made a function that loops on to the data and used that function in the promise request) ====================================

    // ==================================== but we want to add them as a cluster so we first add the collection of features to a vector source because it accepts a collection ====================================

    let cityFeaturesAsVector = new ol.source.Vector({
      features: cityasFeatures,
    });

    // ==================================== then we add use the vector source as the source for our cluster ====================================

    let cityFeaturesAsCluster = new ol.source.Cluster({
      distance: 30,
      minDistance: 10,
      source: cityFeaturesAsVector,
    });

    // ==================================== now we add the cluster to a vector layer and use style to implement our bussiness model ====================================

    let cityFeaturesVectorLayer = new ol.layer.Vector({
      source: cityFeaturesAsCluster,
      style: (cluster) => {
        // ==================================== in each cluster we display the icon (image) for the highest temperature in it, if the highest feature has 30 degrees then a sunny icon (for example) ====================================

        let featuresWithinCluster = cluster.get("features");
        let maxTemp = Number.NEGATIVE_INFINITY;
        let iconURL;
        featuresWithinCluster.forEach((feature) => {
          let featureTemp = feature.get("temperature");
          let maxTemp = Number.NEGATIVE_INFINITY;
          if (featureTemp > maxTemp) {
            maxTemp = featureTemp;
          }
          let maxTempFeature = featuresWithinCluster.find(
            (feature) => feature.get("temperature") === maxTemp
          );

          // ==================================== we add switch cases for the most popular weather conditions on the iconsURl  ====================================

          let featureWeather = maxTempFeature.get("weather");
          console.log(featureWeather);
          switch (featureWeather) {
            case "Clear":
              iconURL = "./sunny.png";
              break;
            case "Clouds":
              iconURL = "./cloud.png";
              break;
            case "Rain":
              iconURL = "./rainy.png";
              break;
            case "Thunderstorm":
              iconURL = "./thunderstorm.png";
              break;

            default:
              iconURL = "./cloudywithrain.png";
              break;
          }
        });

        // ==================================== we return the style with the icon for each of the weather condition corresponding to the max temperature in the cluster  ====================================

        return new ol.style.Style({
          image: new ol.style.Icon({
            src: iconURL,
            scale: 0.1,
          }),
        });
      },
    });

    // ==================================== after we did all that we then added the features on a vector layer to display it on the map ====================================

    map.addLayer(cityFeaturesVectorLayer);
  });

// ==================================== now lets create a methode that creates point features in the format we want from the json file that we fetched ====================================

function createCityTempFeatures(cities) {
  let features = [];
  cities.forEach((cityInCities) => {
    let cityLon = cityInCities.city.coord.lon;
    let cityLat = cityInCities.city.coord.lat;
    let cityName = cityInCities.city.name;
    let cityTemperature = cityInCities.main.temp;
    let cityWeather = cityInCities.weather[0].main;
    let cityTempFeatures = new ol.Feature({
      geometry: new ol.geom.Point(
        ol.proj.transform([cityLon, cityLat], "EPSG:4326", "EPSG:3857")
      ),
      name: cityName,
      weather: cityWeather,
      temperature: cityTemperature,
    });
    features.push(cityTempFeatures);
  });
  return features;
}
