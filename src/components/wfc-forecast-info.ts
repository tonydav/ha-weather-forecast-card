import { html, LitElement, nothing, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";
import { getUvIndexColor } from "../data/uv-index";
import {
  ForecastAttribute,
  WeatherEntity,
  getNormalizedWindBearing,
  getWindBearing,
} from "../data/weather";
import { ExtendedHomeAssistant, WeatherForecastCardConfig } from "../types";
import { logger } from "../logger";
import "./wfc-wind-indicator";

@customElement("wfc-forecast-info")
export class WfcForecastInfo extends LitElement {
  @property({ attribute: false }) hass!: ExtendedHomeAssistant;
  @property({ attribute: false }) weatherEntity!: WeatherEntity;
  @property({ attribute: false }) forecast!: ForecastAttribute;
  @property({ attribute: false }) config!: WeatherForecastCardConfig;

  protected createRenderRoot() {
    return this;
  }

  render() {
    if (!this.forecast) {
      return nothing;
    }

    return html`
      <div class="wfc-forecast-slot-info">
        ${this.getExtraInfo() ?? nothing}
        ${this.getWindChip()}
      </div>
    `;
  }

  private getExtraInfo(): TemplateResult | null {
    const attribute = this.config?.forecast?.extra_attribute;
    if (!attribute) {
      return null;
    }

    if (attribute === "precipitation_probability") {
      const probability = Math.round(
        this.forecast.precipitation_probability || 0
      );

      return probability > 0
        ? html`
            <span class="wfc-forecast-precip-probability wfc-secondary">
              ${probability < 10 ? `<10%` : `${probability}%`}
            </span>
          `
        : null;
    } else if (attribute === "uv_index") {
      const raw = this.forecast.uv_index;
      if (raw == null) {
        return null;
      }
      const rounded = Math.round(raw);
      const colorProp = getUvIndexColor(raw);
      return html`
        <span
          class="wfc-forecast-extra-uv-index wfc-secondary"
          style=${styleMap({ color: `var(${colorProp})` })}
          >${String(rounded)}</span
        >
      `;
    } else if (attribute === "wind_bearing" || attribute === "wind_direction") {
      return html`<wfc-wind-indicator
        .hass=${this.hass}
        .weatherEntity=${this.weatherEntity}
        .forecast=${this.forecast}
        .type="${attribute === "wind_direction" ? "direction" : "bearing"}"
      ></wfc-wind-indicator>`;
    } else {
      logger.warn(`Unsupported forecast.extra_attribute: ${attribute}`);
    }

    return null;
  }

  /**
   * Compact per-slot wind line, e.g. "SE 19/g30" (direction, sustained,
   * gust) or "SE 19" when no gust is reported. Opt-in via
   * `forecast.wind_chip`; renders nothing when the slot carries no wind
   * data at all. Speed units are the weather entity's own (stated once in
   * the card heading rather than repeated per slot).
   */
  private getWindChip(): TemplateResult | typeof nothing {
    if (!this.config?.forecast?.wind_chip) {
      return nothing;
    }

    const dir = getWindBearing(getNormalizedWindBearing(this.forecast));
    const speed = this.forecast.wind_speed;
    const gust = this.forecast.wind_gust_speed;

    if (dir == null && speed == null && gust == null) {
      return nothing;
    }

    const sustained = speed != null ? `${Math.round(speed)}` : "";
    const gustText = gust != null ? `g${Math.round(gust)}` : "";
    const speedText = sustained
      ? gustText
        ? `${sustained}/${gustText}`
        : sustained
      : gustText;

    return html`<span
      class="wfc-forecast-slot-wind wfc-secondary"
      style="display: block;"
      >${(dir ? `${dir} ` : "") + speedText}</span
    >`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "wfc-forecast-info": WfcForecastInfo;
  }
}
