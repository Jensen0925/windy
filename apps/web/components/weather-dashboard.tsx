"use client";

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  CloudRain,
  Compass,
  Crosshair,
  Gauge,
  Layers3,
  LocateFixed,
  MapPin,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Satellite,
  Sun,
  Thermometer,
  Wind,
  X,
  Zap,
} from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ForecastModel, WeatherLayer } from "@/lib/weather";
import {
  CHINA_BOUNDS,
  formatCoordinate,
  getCompassDirection,
  getForecastPoint,
  getLayerValue,
  WEATHER_LAYERS,
} from "@/lib/weather";

const WeatherMap = dynamic(() => import("./weather-map").then((module) => module.WeatherMap), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      <div className="loading-orbit" />
      <span>正在构建中国天气场</span>
    </div>
  ),
});

const LAYER_ICONS: Record<WeatherLayer, LucideIcon> = {
  wind: Wind,
  temperature: Thermometer,
  precipitation: CloudRain,
  irradiance: Sun,
};

const PLACES = [
  { name: "北京", point: [116.41, 39.9] as [number, number] },
  { name: "上海", point: [121.47, 31.23] as [number, number] },
  { name: "广州", point: [113.26, 23.13] as [number, number] },
  { name: "成都", point: [104.07, 30.67] as [number, number] },
  { name: "武汉", point: [114.31, 30.59] as [number, number] },
  { name: "西安", point: [108.94, 34.34] as [number, number] },
  { name: "拉萨", point: [91.11, 29.65] as [number, number] },
];

function getForecastStart() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(Math.floor(now.getHours() / 3) * 3);
  return now;
}

export function WeatherDashboard() {
  const [activeLayer, setActiveLayer] = useState<WeatherLayer>("wind");
  const [model, setModel] = useState<ForecastModel>("ECMWF");
  const [timeStep, setTimeStep] = useState(1);
  const [selectedPoint, setSelectedPoint] = useState<[number, number]>([116.41, 39.9]);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const forecastStart = useMemo(getForecastStart, []);
  const activeDefinition =
    WEATHER_LAYERS.find((item) => item.id === activeLayer) ?? WEATHER_LAYERS[0];
  const _selectedForecast = getForecastPoint(selectedPoint[0], selectedPoint[1], timeStep, model);
  const selectedPlace = getNearestPlace(selectedPoint);
  const forecastTimes = useMemo(
    () =>
      Array.from(
        { length: 32 },
        (_, index) => new Date(forecastStart.getTime() + index * 3 * 60 * 60 * 1000),
      ),
    [forecastStart],
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setTimeStep((current) => (current + 1) % forecastTimes.length);
    }, 1150);
    return () => window.clearInterval(timer);
  }, [forecastTimes.length, playing]);

  useEffect(() => {
    const item = timelineRef.current?.querySelector(`[data-step="${timeStep}"]`);
    item?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [timeStep]);

  const updateSelectedPoint = (point: [number, number]) => {
    setSelectedPoint(point);
    setDetailsOpen(true);
  };

  const updateLayer = (layer: WeatherLayer) => {
    setActiveLayer(layer);
    setDetailsOpen(true);
  };

  const goToUserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const longitude = Math.min(
          CHINA_BOUNDS[1][0],
          Math.max(CHINA_BOUNDS[0][0], coords.longitude),
        );
        const latitude = Math.min(
          CHINA_BOUNDS[1][1],
          Math.max(CHINA_BOUNDS[0][1], coords.latitude),
        );
        const point: [number, number] = [longitude, latitude];
        setSelectedPoint(point);
        map?.flyTo({ center: point, zoom: 5.3, duration: 1100 });
      },
      () => map?.flyTo({ center: selectedPoint, zoom: 5.3, duration: 900 }),
    );
  };

  const resetView = () => {
    map?.fitBounds(CHINA_BOUNDS, { padding: 46, duration: 900 });
  };

  return (
    <main className="weather-app">
      <WeatherMap
        activeLayer={activeLayer}
        model={model}
        timeStep={timeStep}
        selectedPoint={selectedPoint}
        onSelectPoint={updateSelectedPoint}
        onMapReady={setMap}
      />

      <header className="topbar glass-panel">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <Wind size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-name">风域中国</div>
            <div className="brand-caption">CHINA WEATHER FIELD</div>
          </div>
        </div>

        <fieldset className="model-switch">
          <legend className="sr-only">预报模型</legend>
          {(["ECMWF", "GFS"] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={model === item ? "is-active" : ""}
              onClick={() => setModel(item)}
              aria-pressed={model === item}
            >
              {item}
              <span>{item === "ECMWF" ? "欧洲中心" : "美国全球"}</span>
            </button>
          ))}
        </fieldset>

        <div className="status-cluster">
          <div className="status-pill">
            <span className="status-dot" />
            <span>模型已更新</span>
            <strong>08:00</strong>
          </div>
          <button type="button" className="icon-button top-action" aria-label="图层信息">
            <Layers3 size={18} />
          </button>
        </div>
      </header>

      <aside className="layer-rail glass-panel" aria-label="天气图层选择">
        <div className="rail-title">
          <span>图层</span>
          <span className="rail-line" />
        </div>
        <div className="layer-list">
          {WEATHER_LAYERS.map((layer) => {
            const Icon = LAYER_ICONS[layer.id];
            const active = layer.id === activeLayer;
            return (
              <button
                type="button"
                key={layer.id}
                className={`layer-button ${active ? "is-active" : ""}`}
                onClick={() => updateLayer(layer.id)}
                aria-pressed={active}
                style={{ "--layer-accent": layer.accent } as React.CSSProperties}
              >
                <span className="layer-icon">
                  <Icon size={19} />
                </span>
                <span className="layer-copy">
                  <strong>{layer.label}</strong>
                  <small>{layer.description}</small>
                </span>
                <span className="layer-unit">{layer.unit}</span>
              </button>
            );
          })}
        </div>
        <div className="rail-footnote">
          <Activity size={14} />
          <span>开发演示场 · 非业务预报</span>
        </div>
      </aside>

      <fieldset className="map-controls glass-panel">
        <legend className="sr-only">地图控制</legend>
        <button type="button" aria-label="放大地图" onClick={() => map?.zoomIn({ duration: 350 })}>
          <Plus size={18} />
        </button>
        <button type="button" aria-label="缩小地图" onClick={() => map?.zoomOut({ duration: 350 })}>
          <Minus size={18} />
        </button>
        <span />
        <button type="button" aria-label="定位" onClick={goToUserLocation}>
          <LocateFixed size={18} />
        </button>
        <button type="button" aria-label="复位中国视图" onClick={resetView}>
          <RotateCcw size={17} />
        </button>
      </fieldset>

      <div className="map-context glass-panel">
        <Crosshair size={14} />
        <span>{formatCoordinate(selectedPoint[1], "N", "S")}</span>
        <span>{formatCoordinate(selectedPoint[0], "E", "W")}</span>
      </div>

      {detailsOpen ? (
        <ForecastPanel
          layer={activeLayer}
          model={model}
          point={selectedPoint}
          placeName={selectedPlace}
          timeStep={timeStep}
          forecastTime={forecastTimes[timeStep] ?? forecastStart}
          onClose={() => setDetailsOpen(false)}
        />
      ) : (
        <button
          type="button"
          className="reopen-details glass-panel"
          onClick={() => setDetailsOpen(true)}
        >
          <MapPin size={18} />
          <span>查看点位</span>
        </button>
      )}

      <div
        className="legend-card glass-panel"
        style={{ "--legend-accent": activeDefinition?.accent } as React.CSSProperties}
      >
        <div className="legend-heading">
          <span>{activeDefinition?.label}</span>
          <strong>{activeDefinition?.unit}</strong>
        </div>
        <div
          className="legend-gradient"
          style={{ background: `linear-gradient(90deg, ${activeDefinition?.colors.join(",")})` }}
        />
        <div className="legend-scale">
          {getLegendValues(activeLayer).map((value) => (
            <span key={value}>{value}</span>
          ))}
        </div>
      </div>

      <Timeline
        times={forecastTimes}
        activeStep={timeStep}
        playing={playing}
        onTogglePlaying={() => setPlaying((value) => !value)}
        onChange={setTimeStep}
        timelineRef={timelineRef}
      />

      <div className="data-credit">
        <Satellite size={13} />
        <span>{model} 数值模式 · 3h 时间步 · 本地模拟数据</span>
      </div>
    </main>
  );
}

function ForecastPanel({
  layer,
  model,
  point,
  placeName,
  timeStep,
  forecastTime,
  onClose,
}: {
  layer: WeatherLayer;
  model: ForecastModel;
  point: [number, number];
  placeName: string;
  timeStep: number;
  forecastTime: Date;
  onClose: () => void;
}) {
  const forecast = getForecastPoint(point[0], point[1], timeStep, model);
  const definition = WEATHER_LAYERS.find((item) => item.id === layer) ?? WEATHER_LAYERS[0];
  const mainValue = getLayerValue(forecast, layer);
  const chartValues = Array.from({ length: 12 }, (_, index) => {
    const item = getForecastPoint(point[0], point[1], timeStep + index, model);
    return getLayerValue(item, layer);
  });

  return (
    <aside className="forecast-panel glass-panel" aria-label="点位天气详情">
      <div className="panel-topline" />
      <div className="forecast-header">
        <div>
          <div className="location-kicker">
            <MapPin size={13} /> 选定网格
          </div>
          <h2>{placeName}</h2>
          <p>
            {formatForecastDate(forecastTime)} · {model}
          </p>
        </div>
        <button type="button" className="icon-button" aria-label="关闭详情" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="primary-reading">
        <div className="reading-icon" style={{ color: definition?.accent }}>
          {definition &&
            (() => {
              const Icon = LAYER_ICONS[definition.id];
              return <Icon size={24} />;
            })()}
        </div>
        <div>
          <span className="reading-label">{definition?.description}</span>
          <div className="reading-value">
            {mainValue}
            <small>{definition?.unit}</small>
          </div>
        </div>
        {layer === "wind" && (
          <div className="wind-direction">
            <Compass size={28} style={{ transform: `rotate(${forecast.windDirection}deg)` }} />
            <span>
              {getCompassDirection(forecast.windDirection)}风 {forecast.windDirection}°
            </span>
          </div>
        )}
      </div>

      <div className="metric-grid">
        <Metric icon={Wind} label="风速" value={`${forecast.windSpeed} m/s`} />
        <Metric icon={Thermometer} label="气温" value={`${forecast.temperature} °C`} />
        <Metric icon={CloudRain} label="降水" value={`${forecast.precipitation} mm`} />
        <Metric icon={Sun} label="辐照" value={`${forecast.irradiance} W/m²`} />
      </div>

      <div className="trend-card">
        <div className="trend-heading">
          <div>
            <span>未来 36 小时</span>
            <strong>{definition?.label}趋势</strong>
          </div>
          <div className="trend-badge">
            <Zap size={12} /> 3h
          </div>
        </div>
        <Sparkline values={chartValues} color={definition?.accent ?? "#69f3d0"} />
        <div className="trend-hours">
          <span>现在</span>
          <span>+12h</span>
          <span>+24h</span>
          <span>+36h</span>
        </div>
      </div>

      <div className="panel-footer">
        <Gauge size={14} />
        <span>网格约 0.25° · 数值仅用于界面演示</span>
      </div>
    </aside>
  );
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="metric-item">
      <Icon size={15} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map(
      (value, index) =>
        `${(index / (values.length - 1)) * 280},${55 - ((value - min) / range) * 43}`,
    )
    .join(" ");
  const area = `0,62 ${points} 280,62`;
  return (
    <svg className="sparkline" viewBox="0 0 280 64" role="img" aria-label="天气趋势折线图">
      <defs>
        <linearGradient id="sparkArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="20" x2="280" y2="20" className="chart-grid" />
      <line x1="0" y1="42" x2="280" y2="42" className="chart-grid" />
      <polygon points={area} fill="url(#sparkArea)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="0" cy={points.split(" ")[0]?.split(",")[1] ?? "32"} r="3.2" fill={color} />
    </svg>
  );
}

function Timeline({
  times,
  activeStep,
  playing,
  onTogglePlaying,
  onChange,
  timelineRef,
}: {
  times: Date[];
  activeStep: number;
  playing: boolean;
  onTogglePlaying: () => void;
  onChange: (step: number) => void;
  timelineRef: React.RefObject<HTMLDivElement | null>;
}) {
  const activeTime = times[activeStep] ?? times[0];
  return (
    <section className="timeline glass-panel" aria-label="预报时间轴">
      <div className="timeline-control">
        <button
          type="button"
          className="play-button"
          onClick={onTogglePlaying}
          aria-label={playing ? "暂停播放" : "播放预报"}
        >
          {playing ? (
            <Pause size={19} fill="currentColor" />
          ) : (
            <Play size={19} fill="currentColor" />
          )}
        </button>
        <div className="active-time">
          <span>预报时效</span>
          <strong>{activeTime ? formatTimelineDate(activeTime) : "--"}</strong>
        </div>
        <button
          type="button"
          className="step-button"
          aria-label="上一个时次"
          onClick={() => onChange(Math.max(0, activeStep - 1))}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          className="step-button"
          aria-label="下一个时次"
          onClick={() => onChange(Math.min(times.length - 1, activeStep + 1))}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="timeline-track" ref={timelineRef}>
        {times.map((time, index) => {
          const isMidnight = time.getHours() === 0;
          return (
            <button
              type="button"
              key={time.toISOString()}
              data-step={index}
              className={`time-tick ${index === activeStep ? "is-active" : ""} ${isMidnight ? "is-day-start" : ""}`}
              onClick={() => onChange(index)}
            >
              {isMidnight && <span className="day-label">{formatDayLabel(time)}</span>}
              <span className="tick-line" />
              <span className="tick-hour">{String(time.getHours()).padStart(2, "0")}:00</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function getNearestPlace(point: [number, number]) {
  const nearest = PLACES.reduce(
    (best, place) => {
      const distance = Math.hypot(place.point[0] - point[0], place.point[1] - point[1]);
      return distance < best.distance ? { name: place.name, distance } : best;
    },
    { name: "自选点位", distance: Number.POSITIVE_INFINITY },
  );
  return nearest.distance < 1.4 ? nearest.name : "自选点位";
}

function getLegendValues(layer: WeatherLayer) {
  switch (layer) {
    case "wind":
      return ["0", "4", "8", "12", "16", "20+"];
    case "temperature":
      return ["-18", "-5", "10", "22", "32", "40+"];
    case "precipitation":
      return ["0", "1", "4", "10", "18", "25+"];
    case "irradiance":
      return ["0", "180", "360", "540", "720", "900+"];
  }
}

function formatForecastDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function formatTimelineDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Shanghai",
  }).format(date);
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "Asia/Shanghai",
  }).format(date);
}
