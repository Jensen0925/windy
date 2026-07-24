"use client";

import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import {
  chinaFeature,
  cities,
  countries,
  createGraticule,
  createWeatherGrid,
  isInsideChina,
} from "@/lib/map-data";
import type { ForecastModel, WeatherLayer } from "@/lib/weather";
import { CHINA_BOUNDS, getWindVector, WEATHER_LAYERS } from "@/lib/weather";

interface WeatherMapProps {
  activeLayer: WeatherLayer;
  model: ForecastModel;
  timeStep: number;
  selectedPoint: [number, number];
  onSelectPoint: (point: [number, number]) => void;
  onMapReady: (map: MapLibreMap | null) => void;
}

const emptyFeatureCollection: GeoJSON.FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function WeatherMap({
  activeLayer,
  model,
  timeStep,
  selectedPoint,
  onSelectPoint,
  onMapReady,
}: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const callbackRef = useRef(onSelectPoint);

  useEffect(() => {
    callbackRef.current = onSelectPoint;
  }, [onSelectPoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      center: [104.5, 35.2],
      zoom: 3.25,
      minZoom: 2.7,
      maxZoom: 8,
      maxBounds: [
        [66, 8],
        [143, 61],
      ],
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: { "background-color": "#08131c" },
          },
        ],
      },
    });

    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    onMapReady(map);

    map.on("load", () => {
      map.addSource("countries", { type: "geojson", data: countries });
      map.addSource("china", {
        type: "geojson",
        data: chinaFeature ?? emptyFeatureCollection,
      });
      map.addSource("graticule", { type: "geojson", data: createGraticule() });
      map.addSource("weather", {
        type: "geojson",
        data: createWeatherGrid(activeLayer, timeStep, model),
      });
      map.addSource("cities", { type: "geojson", data: cities });
      map.addSource("selected-point", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: selectedPoint },
        },
      });

      map.addLayer({
        id: "countries-fill",
        type: "fill",
        source: "countries",
        paint: {
          "fill-color": "#0d2330",
          "fill-opacity": 0.92,
        },
      });
      map.addLayer({
        id: "countries-line",
        type: "line",
        source: "countries",
        paint: {
          "line-color": "rgba(131, 172, 186, 0.18)",
          "line-width": 0.7,
        },
      });
      map.addLayer({
        id: "graticule",
        type: "line",
        source: "graticule",
        paint: {
          "line-color": "rgba(129, 172, 187, 0.09)",
          "line-width": 0.8,
          "line-dasharray": [3, 4],
        },
      });
      map.addLayer({
        id: "china-base",
        type: "fill",
        source: "china",
        paint: {
          "fill-color": "#173442",
          "fill-opacity": 0.96,
        },
      });
      map.addLayer({
        id: "weather-field",
        type: "circle",
        source: "weather",
        paint: getWeatherPaint(activeLayer),
      });
      map.addLayer({
        id: "china-outline-glow",
        type: "line",
        source: "china",
        paint: {
          "line-color": "rgba(121, 243, 208, 0.2)",
          "line-width": 5,
          "line-blur": 4,
        },
      });
      map.addLayer({
        id: "china-outline",
        type: "line",
        source: "china",
        paint: {
          "line-color": "rgba(211, 239, 238, 0.78)",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.9, 6, 1.7],
        },
      });
      map.addLayer({
        id: "city-points",
        type: "circle",
        source: "cities",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 6, 4],
          "circle-color": "#e7ffff",
          "circle-stroke-color": "rgba(8, 19, 28, 0.85)",
          "circle-stroke-width": 1.4,
        },
      });
      map.addLayer({
        id: "selected-halo",
        type: "circle",
        source: "selected-point",
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(105, 243, 208, 0.14)",
          "circle-stroke-color": "rgba(105, 243, 208, 0.45)",
          "circle-stroke-width": 1,
        },
      });
      map.addLayer({
        id: "selected-core",
        type: "circle",
        source: "selected-point",
        paint: {
          "circle-radius": 4.5,
          "circle-color": "#ffffff",
          "circle-stroke-color": "#69f3d0",
          "circle-stroke-width": 2.5,
        },
      });

      addCityLabels(map);
    });

    map.on("click", (event) => {
      const point: [number, number] = [event.lngLat.lng, event.lngLat.lat];
      if (isInsideChina(point)) callbackRef.current(point);
    });

    return () => {
      onMapReady(null);
      map.remove();
      mapRef.current = null;
    };
  }, [model, timeStep, selectedPoint, onMapReady, activeLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource("weather") as GeoJSONSource | undefined;
    source?.setData(createWeatherGrid(activeLayer, timeStep, model));
    if (map.getLayer("weather-field")) {
      const paint = getWeatherPaint(activeLayer);
      for (const [property, value] of Object.entries(paint)) {
        map.setPaintProperty("weather-field", property, value);
      }
    }
  }, [activeLayer, model, timeStep]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const source = map.getSource("selected-point") as GeoJSONSource | undefined;
    source?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: selectedPoint },
    });
  }, [selectedPoint]);

  return (
    <section className="map-stage" aria-label="中国天气预报交互地图">
      <div ref={containerRef} className="map-container" />
      <WindParticles map={mapRef} active={activeLayer === "wind"} timeStep={timeStep} />
      <div className="map-vignette" />
      <div className="map-scanline" />
    </section>
  );
}

function getWeatherPaint(
  layer: WeatherLayer,
): NonNullable<maplibregl.CircleLayerSpecification["paint"]> {
  const definition = WEATHER_LAYERS.find((item) => item.id === layer) ?? WEATHER_LAYERS[0];
  const colors = definition?.colors ?? ["#19324a", "#3c8ca1", "#69f3d0"];
  return {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 2.8, 42, 5, 92, 8, 180],
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "intensity"],
      0,
      colors[0] ?? "#173754",
      0.2,
      colors[1] ?? "#236e8a",
      0.4,
      colors[2] ?? "#39b9ae",
      0.6,
      colors[3] ?? "#a2e65e",
      0.8,
      colors[4] ?? "#f2c94c",
      1,
      colors[5] ?? "#f5789f",
    ],
    "circle-blur": 1,
    "circle-opacity": layer === "wind" ? 0.42 : 0.76,
  };
}

function addCityLabels(map: MapLibreMap) {
  for (const city of cities.features) {
    if (city.geometry.type !== "Point") continue;
    const coordinates = city.geometry.coordinates as [number, number];
    const name = String(city.properties?.name ?? "");
    const element = document.createElement("div");
    element.className = "city-label";
    element.textContent = name;
    new maplibregl.Marker({ element, anchor: "left", offset: [7, -1] })
      .setLngLat(coordinates)
      .addTo(map);
  }
}

interface Particle {
  longitude: number;
  latitude: number;
  age: number;
  life: number;
}

function WindParticles({
  map,
  active,
  timeStep,
}: {
  map: React.RefObject<MapLibreMap | null>;
  active: boolean;
  timeStep: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const currentMap = map.current;
    if (!canvas || !currentMap || !active) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const particles = Array.from({ length: prefersReducedMotion ? 180 : 760 }, createParticle);
    let frame = 0;
    let animationFrame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const bounds = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      const bounds = canvas.getBoundingClientRect();
      context.globalCompositeOperation = "destination-in";
      context.fillStyle = prefersReducedMotion ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.91)";
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.globalCompositeOperation = "source-over";
      context.lineWidth = 0.85;
      context.strokeStyle = "rgba(215, 255, 246, 0.62)";
      context.beginPath();

      for (const particle of particles) {
        const start = currentMap.project([particle.longitude, particle.latitude]);
        const vector = getWindVector(particle.longitude, particle.latitude, timeStep);
        particle.longitude += vector.x * 0.035;
        particle.latitude += vector.y * 0.022;
        particle.age += 1;
        const end = currentMap.project([particle.longitude, particle.latitude]);

        if (
          particle.age > particle.life ||
          !isInsideChina([particle.longitude, particle.latitude]) ||
          end.x < 0 ||
          end.y < 0 ||
          end.x > bounds.width ||
          end.y > bounds.height
        ) {
          Object.assign(particle, createParticle());
          continue;
        }

        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
      }
      context.stroke();
      frame += 1;
      if (!prefersReducedMotion || frame < 2) animationFrame = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, map, timeStep]);

  return <canvas ref={canvasRef} className={`wind-canvas ${active ? "is-visible" : ""}`} />;
}

function createParticle(): Particle {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const longitude =
      CHINA_BOUNDS[0][0] + Math.random() * (CHINA_BOUNDS[1][0] - CHINA_BOUNDS[0][0]);
    const latitude = CHINA_BOUNDS[0][1] + Math.random() * (CHINA_BOUNDS[1][1] - CHINA_BOUNDS[0][1]);
    if (isInsideChina([longitude, latitude])) {
      return { longitude, latitude, age: 0, life: 35 + Math.random() * 100 };
    }
  }
  return { longitude: 105, latitude: 34, age: 0, life: 60 };
}

export { CHINA_BOUNDS };
