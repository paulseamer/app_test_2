import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm'

/* set dimensions and margins for small multiple plots */
const plotTitleSpacer = 20
const margin = { top: 20 + plotTitleSpacer, left: 20, right: 20, bottom: 10 }
const width = 500 - margin.left - margin.right
const height = 200 - margin.top - margin.bottom

/* d3.histogram() function computes the binning and returns the coordinates of
each bar. Bars can then be drawn using a classic .append("rect") */

/* blob dir */
const blobDir = 'https://paulseamer.github.io/app_test_2/'

/* define axes - a 1D histogram only requires an x-axis */
let xScale = d3.scaleLinear().range([margin.left, width])

/* define a color palette (histogram bins) */
/* color scale maps to counts of values in bins; domain([min, median, max]) */
const colorPal = d3
  .scaleDiverging((d) => d3.interpolateViridis(1 - d))
  .domain([0, 40, 80])

/* set transition duration for updatePlots fn */
const transDur = 1800

/* define a tooltip */
const tooltip = d3
  .select('body')
  .append('div')
  .attr('class', 'tooltip')
  .attr('id', 'tooltip-hsa')
  .style('opacity', 0)

/* fn: mouseover for tooltip */
function mouseOver(event, d) {
  if (d3.select(this.parentNode).style('opacity') != 0) {
    const svg = d3.select(this.parentNode.parentNode)
    const [x, y] = d3.pointer(event, svg)
    const text = d3.select('#tooltip-hsa')
    text.text(d3.format(',.2f')(d.x) + '%')
    tooltip
      .style('left', x + 'px')
      .style('top', y + 'px')
      .transition()
      .duration(1000)
      .style('opacity', 1)
    d3.select(this).transition().duration(100).attr('r', 8)
  }
}

/* fn: mouseout for tooltip */
function mouseOut() {
  d3.select(this).transition().duration(1000).attr('r', 4)
  tooltip.transition().delay(1000).style('opacity', 0)
}

/* fn: plot panel of histograms for hsagrps in a pod */
function plotHsaGrps(projDat) {
  /* data to plot */
  let hsaGrps = Array.from(
    d3.group(projDat, (d) => d.hsagrp),
    ([key, value]) => ({ key, value })
  )

  /* create a separate svg object for each hsagrp and
  use hsagrp name to set the class of each svg */
  d3.select('.div-panel')
    .selectAll('svg')
    .data(hsaGrps)
    .enter()
    .append('svg')
    .attr('class', function (d) {
      return d.value[0].hsagrp
    })
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)

  /* iterate over data array and create plot elements (x-axis, bars, and circles) */
  hsaGrps.forEach(function (d) {
    /* set xScale domain based on range of end_p values in each hsagrp */
    let maxEndp = d3.max(d.value.map((d) => Number(d.end_p)))
    xScale.domain([0, maxEndp]).nice(5)

    /* define x-axis for each hsagrp */
    let xAxis = d3.axisBottom().scale(xScale)

    /* attempt to find optimal number of bins for each hsagrp */
    let binDat = d3
      .bin()
      .thresholds(30)
      .value((d) => Number(d.end_p))(d.value)

    /* obtain coordinates for plotting circles */
    let cx = d.value.map((d) => Number(d.end_p_nohsa))[0]
    let cy = height / 1.66 / 2
    let circleDat = [{ x: cx, y: cy }]

    /* select the correct svg for each hsagrp */
    let svg = d3.select('svg.' + d.value[0].hsagrp)

    /* set bars group */
    let bars = svg
      .selectAll('rect')
      .data(binDat)
      .enter()
      .append('g')
      .attr('class', 'bar')
      .attr('id', 'end-p-bar')

    /* set circles group */
    let circles = svg
      .selectAll('circle')
      .data(circleDat)
      .enter()
      .append('g')
      .attr('class', 'circle')
      .attr('id', 'nohsa-circle')

    /* draw bars */
    bars
      .append('rect')
      .attr('transform', function (d) {
        return 'translate(' + xScale(d.x1) + ',' + margin.top + ')'
      })
      .attr('x', 0)
      .attr('width', function (d) {
        return xScale(d.x1) - xScale(d.x0)
      })
      .attr('height', height / 1.66)
      .style('fill', function (d) {
        return colorPal(d.length)
      })

    /* draw circles */
    circles
      .append('circle')
      .attr('transform', 'translate(' + 0 + ',' + margin.top + ')')
      .attr('cx', function (d) {
        return xScale(d.x)
      })
      .attr('cy', function (d) {
        return d.y
      })
      .attr('r', 4)
      .style('fill', '#fd484e')
      .on('mouseover', mouseOver)
      .on('mouseout', mouseOut)

    /* add x-axis */
    svg
      .append('g')
      .attr('class', 'axis')
      .attr('id', 'x-axis')
      .attr('transform', `translate(${0}, ${margin.top + height / 1.66})`)
      .call(xAxis)

    /* add title */
    svg
      .append('text')
      .attr('class', 'title')
      .attr('id', 'hsagrp-title')
      .attr('transform', `translate(${margin.left}, ${plotTitleSpacer})`)
      .text(d.value[0].hsagrp_lab)
      .style('text-anchor', 'left')

    /* add x-axis label */
    svg
      .append('text')
      .attr('class', 'axis-label')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)
      .text('Per cent change')
      .style('text-anchor', 'left')
  })
}

/* initialise chart with data using hardcoded csv file name */
d3.csv(blobDir + 'test_results_E08000026.csv').then(function (data) {
  /* group the data */
  let grpDat = d3.group(
    data,
    (d) => d.proj_id,
    (d) => d.end_year,
    (d) => d.pod
  )

  /* initialise with hardcoded projection variant, model horizon, and pod */
  let selectedProjVar = '1'
  let selectedHorizon = '2025'
  let selectedPod = 'aae'

  let projDat = grpDat
    .get(selectedProjVar)
    .get(selectedHorizon)
    .get(selectedPod)

  plotHsaGrps(projDat)

  /* fn: update the plots when the data (area), projection variant or model horizon changes */
  function updatePlots(grpDat, selectedProjVar, selectedHorizon, selectedPod) {
    /* get the new data */
    let projDat = grpDat
      .get(selectedProjVar)
      .get(selectedHorizon)
      .get(selectedPod)

    /* data to plot */
    let hsaGrps = Array.from(
      d3.group(projDat, (d) => d.hsagrp),
      ([key, value]) => ({ key, value })
    )

    /* iterate over data array and create plot elements (x-axis, bars, and circles) */
    hsaGrps.forEach(function (d) {
      /* set xScale domain based on range of end_p values in each hsagrp */
      let maxEndp = d3.max(d.value.map((d) => Number(d.end_p)))
      xScale.domain([0, maxEndp]).nice(5)

      /* define x-axis for each hsagrp */
      let xAxis = d3.axisBottom().scale(xScale)

      /* attempt to find optimal number of bins for each hsagrp */
      let binDat = d3
        .bin()
        .thresholds(30)
        .value((d) => Number(d.end_p))(d.value)

      /* select the correct svg for each hsagrp */
      let svg = d3.select('svg.' + d.value[0].hsagrp)

      /* transition bars */
      svg
        .selectAll('rect')
        .data(binDat)
        .join('rect')
        .transition()
        .duration(transDur)
        .attr('transform', function (d) {
          return 'translate(' + xScale(d.x1) + ',' + margin.top + ')'
        })
        .attr('x', 0)
        .attr('width', function (d) {
          return xScale(d.x1) - xScale(d.x0)
        })
        .attr('height', height / 1.66)
        .style('fill', function (d) {
          return colorPal(d.length)
        })

      svg.selectAll('#end-p-bar').exit().remove()

      /* transition circles */
      let cx = d.value.map((d) => Number(d.end_p_nohsa))[0]
      let cy = height / 1.66 / 2
      let circleDat = [{ x: cx, y: cy }]

      svg
        .selectAll('circle')
        .data(circleDat)
        .join('circle')
        .transition()
        .duration(transDur)
        .attr('transform', 'translate(' + 0 + ',' + margin.top + ')')
        .attr('cx', function (d) {
          return xScale(d.x)
        })
        .attr('cy', function (d) {
          return d.y
        })
        .attr('r', 4)
        .style('fill', '#fd484e')

      /* hack to make sure circles appear on top of bars */
      svg.selectAll('.circle').raise()

      /* transition x-axis */
      svg.selectAll('#x-axis').transition().duration(transDur).call(xAxis)
    })
  }

  /* fn: switch the plots when pod changes */
  function switchPod(selectedProjVar, selectedHorizon, selectedPod) {
    /* group the data */
    let grpDat = d3.group(
      data,
      (d) => d.proj_id,
      (d) => d.end_year,
      (d) => d.pod
    )

    /* get the new data */
    let projDat = grpDat
      .get(selectedProjVar)
      .get(selectedHorizon)
      .get(selectedPod)

    /* remove plots */
    d3.select('#small-multiples').selectAll('svg').remove()
    /* reset hsa toggle */
    d3.select('#toggleHsa').property('checked', false)
    plotHsaGrps(projDat)
    /* hack */
    d3.selectAll('.circle').style('opacity', 0)
  }

  /* fn: update the plots when the area dropdown changes */
  function switchArea(
    selectedArea,
    selectedProjVar,
    selectedHorizon,
    selectedPod
  ) {
    /* get name of csv file from first dropdown */
    let fileNm = blobDir + 'test_results_' + selectedArea + '.csv'

    d3.csv(fileNm).then(function (data) {
      /* group the new data */
      let grpDat = d3.group(
        data,
        (d) => d.proj_id,
        (d) => d.end_year,
        (d) => d.pod
      )

      updatePlots(grpDat, selectedProjVar, selectedHorizon, selectedPod)
    })
  }

  /* fn: update the plots when the hsa toggle changes */
  function toggleHsa(opacity) {
    d3.selectAll('.circle').style('opacity', opacity)
  }

  /* when the area dropdown changes, run switchArea() */
  d3.select('#selectArea').on('change', function () {
    /* recover the value that has been selected */
    let selectedArea = d3.select(this).property('value')
    let selectedProjVar = d3.select('#selectProjVar').property('value')
    let selectedHorizon = d3.select('#selectHorizon').property('value')
    let selectedPod = d3.select('#selectPod').property('value')
    /* run switchArea() with the new value */
    switchArea(selectedArea, selectedProjVar, selectedHorizon, selectedPod)
  })

  /* when the pod dropdown changes, run switchPod() */
  d3.select('#selectPod').on('change', function () {
    /* recover the new value */
    let selectedPod = d3.select(this).property('value')
    let selectedProjVar = d3.select('#selectProjVar').property('value')
    let selectedHorizon = d3.select('#selectHorizon').property('value')
    /* run switchPod() with the new value */
    switchPod(selectedProjVar, selectedHorizon, selectedPod)
  })

  /* when the model horizon dropdown changes, run updatePlots() */
  d3.select('#selectHorizon').on('change', function () {
    /* recover the new value */
    let selectedHorizon = d3.select(this).property('value')
    let selectedProjVar = d3.select('#selectProjVar').property('value')
    let selectedPod = d3.select('#selectPod').property('value')
    /* run updatePlots() with the new value */
    updatePlots(grpDat, selectedProjVar, selectedHorizon, selectedPod)
  })

  /* when the projection variant dropdown changes, run updatePlots() */
  d3.select('#selectProjVar').on('change', function () {
    /* recover the new value */
    let selectedProjVar = d3.select(this).property('value')
    let selectedHorizon = d3.select('#selectHorizon').property('value')
    let selectedPod = d3.select('#selectPod').property('value')
    /* run updatePlots() with the new value */
    updatePlots(grpDat, selectedProjVar, selectedHorizon, selectedPod)
  })

  /* when the hsa toggle changes show/hide circles */
  d3.select('#toggleHsa').on('change', function () {
    const opacity = this.checked ? 1 : 0
    toggleHsa(opacity)
  })

  /* hack */
  d3.selectAll('.circle').style('opacity', 0)
})
