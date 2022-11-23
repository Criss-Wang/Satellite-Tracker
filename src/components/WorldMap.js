import React, { Component } from "react";
import axios from "axios";
import { Spin } from "antd";
import { feature } from "topojson-client";
import { geoKavrayskiy7 } from "d3-geo-projection";
import { geoGraticule, geoPath } from "d3-geo";
import { select as d3Select } from "d3-selection";
import { schemeCategory10 } from "d3-scale-chromatic";
import * as d3Scale from "d3-scale";
import { timeFormat as d3TimeFormat } from "d3-time-format";

import {
  BASE_URL,
  WORLD_MAP_URL,
  SATELLITE_POSITION_URL,
  SAT_API_KEY
} from "../constants";


const width = 960;
const height = 600;

class WorldMap extends Component {
  constructor() {
    super();
    this.state = {
      isLoading: false,
      isDrawing: false
    };
    this.map = null;
    this.color = d3Scale.scaleOrdinal(schemeCategory10);
    this.refMap = React.createRef();
    this.refTrack = React.createRef();
  }

  componentDidMount() {
    axios
      .get(WORLD_MAP_URL)
      .then((res) => {
        const { data } = res;
        const land = feature(data, data.objects.countries).features;
        this.generateMap(land);
      })
      .catch((e) => console.log("err in fecth world map data ", e));
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.satData !== this.props.satData) {
      const {
        latitude,
        longitude,
        elevation,
        altitude,
        duration
      } = this.props.observerData;
      const endTime = duration * 60;

      this.setState({
        isLoading: true
      });
      const urls = this.props.satData.map(sat => {
        const { satid } = sat;
        const url = `${BASE_URL}/${SATELLITE_POSITION_URL}/${satid}/${latitude}/${longitude}/${elevation}/${endTime}/&apiKey=${SAT_API_KEY}`;

        return axios.get(url);
      });

      Promise.all(urls)
        .then(res => {
          const arr = res.map(sat => sat.data);
          this.setState({
            isLoading: false,
            isDrawing: true
          });

          if (!prevState.isDrawing) {
            this.track(arr);
          } else {
            const oHint = document.getElementsByClassName("hint")[0];
            oHint.innerHTML =
              "Please wait for these satellite animation to finish before selection new ones!";
          }
        })
        .catch(e => {
          console.log("err in fetch satellite position -> ", e.message);
        });
    }
  }

  generateMap(land) {
    const projection = geoKavrayskiy7()
      .scale(170)
      .translate([width / 2, height / 2])
      .precision(0.1);

    const graticule = geoGraticule();

    const canvas = d3Select(this.refMap.current)
      .attr("width", width)
      .attr("height", height);

    let context = canvas.node().getContext("2d");

    let path = geoPath().projection(projection).context(context);

    land.forEach((ele) => {
      context.fillStyle = "#B3DDEF";
      context.strokeStyle = "#000";
      context.globalAlpha = 0.7;
      context.beginPath();
      path(ele);
      context.fill();
      context.stroke();

      context.strokeStyle = "rgba(220, 220, 220, 0.1)";
      context.beginPath();
      path(graticule());
      context.lineWidth = 0.1;
      context.stroke();

      context.beginPath();
      context.lineWidth = 0.5;
      path(graticule.outline());
      context.stroke();
    });
  }

  render() {
    const { isLoading } = this.state;
    return (
      <div className="map-box">
        {isLoading ? (
          <div className="spinner">
            <Spin tip="Loading..." size="large" />
          </div>
        ) : null}
        <canvas className="map" ref={this.refMap} />
        <canvas className="track" ref={this.refTrack} />
        <div className="hint" />
      </div>
    );

  }
}

export default WorldMap;
