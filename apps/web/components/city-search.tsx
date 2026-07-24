"use client";

import type { ChinaLocation } from "@china-weather/locations";
import { LoaderCircle, MapPin, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { SelectedLocation } from "@/lib/cities";
import { getLocationSubtitle, searchCities } from "@/lib/cities";

interface CitySearchProps {
  selectedCity: SelectedLocation | null;
  onSelect: (city: ChinaLocation) => void;
}

const SEARCH_DELAY = 250;
const RESULT_LIMIT = 10;

export function CitySearch({ selectedCity, onSelect }: CitySearchProps) {
  const [query, setQuery] = useState(selectedCity?.fullName ?? "");
  const [results, setResults] = useState<ChinaLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    setQuery(selectedCity?.fullName ?? "");
    setResults([]);
    setOpen(false);
    setError(null);
    setActiveIndex(-1);
  }, [selectedCity]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || !normalizedQuery) {
      setLoading(false);
      setError(null);
      setResults([]);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const locations = await searchCities(normalizedQuery, {
          limit: RESULT_LIMIT,
          signal: controller.signal,
        });
        setResults(locations);
        setActiveIndex(locations.length > 0 ? 0 : -1);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setResults([]);
        setActiveIndex(-1);
        setError("城市搜索暂时不可用");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DELAY);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query]);

  const selectCity = (city: ChinaLocation) => {
    setQuery(city.fullName);
    setOpen(false);
    setResults([]);
    setActiveIndex(-1);
    onSelect(city);
    inputRef.current?.blur();
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setError(null);
    setActiveIndex(-1);
    setOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      if (results.length > 0) {
        setActiveIndex((index) => (index + 1 + results.length) % results.length);
      }
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (results.length > 0) {
        setActiveIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
      }
      return;
    }

    if (event.key === "Enter" && open && activeIndex >= 0) {
      const activeResult = results[activeIndex];
      if (activeResult) {
        event.preventDefault();
        selectCity(activeResult);
      }
    }
  };

  const hasQuery = query.trim().length > 0;
  const showEmpty = open && hasQuery && !loading && !error && results.length === 0;

  return (
    <div className="city-search" ref={rootRef}>
      <div className={`city-search-field glass-panel ${open ? "is-open" : ""}`}>
        <Search size={17} aria-hidden="true" />
        <input
          ref={inputRef}
          value={query}
          type="search"
          placeholder="搜索省、市、区县（中文 / 拼音 / 首字母）"
          aria-label="搜索全国城市"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          maxLength={50}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setError(null);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
        />
        {loading ? (
          <LoaderCircle className="city-search-spinner" size={16} aria-label="正在搜索" />
        ) : hasQuery ? (
          <button
            type="button"
            className="city-search-clear"
            aria-label="清空搜索"
            onClick={clearSearch}
          >
            <X size={15} />
          </button>
        ) : (
          <span className="city-search-hint">全国</span>
        )}
      </div>

      {open && hasQuery && (
        <div className="city-search-results glass-panel">
          {error ? (
            <div className="city-search-state is-error" role="alert">
              {error}
              <button type="button" onClick={() => setQuery((value: string) => `${value} `)}>
                重试
              </button>
            </div>
          ) : showEmpty ? (
            <div className="city-search-state">未找到匹配的省、市或区县</div>
          ) : results.length > 0 ? (
            <div id={listboxId} role="listbox" aria-label="城市搜索结果">
              {results.map((city, index) => (
                <button
                  id={`${listboxId}-${index}`}
                  key={city.id}
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={index === activeIndex ? "is-active" : ""}
                  onMouseEnter={() => setActiveIndex(index)}
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => selectCity(city)}
                >
                  <span className="city-result-icon">
                    <MapPin size={15} />
                  </span>
                  <span className="city-result-copy">
                    <strong>{city.fullName}</strong>
                    <small>{getLocationSubtitle(city)}</small>
                  </span>
                  <span className="city-result-code">{city.code.slice(0, 6)}</span>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="city-search-state">正在检索全国行政区划…</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
