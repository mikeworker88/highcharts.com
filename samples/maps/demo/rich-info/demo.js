$(function () {

    $.getJSON('http://www.highcharts.th/samples/data/jsonp.php?filename=world-population-history.csv&callback=?', function (csv) {

        // Parse the CSV Data
        /*Highcharts.data({
            csv: data,
            switchRowsAndColumns: true,
            parsed: function () {
                console.log(this.columns);
            }
        });*/

        // Return array of string values, or NULL if CSV string not well formed.
        // Regex parser function written by ridgerunner, http://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript
        function CSVtoArray(text) {
            var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
            var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
            // Return NULL if input string is not well formed CSV string.
            if (!re_valid.test(text)) return null;
            var a = [];                     // Initialize array to receive values.
            text.replace(re_value, // "Walk" the string using replace with callback.
                function(m0, m1, m2, m3) {
                    // Remove backslash from \' in single quoted values.
                    if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
                    // Remove backslash from \" in double quoted values.
                    else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
                    else if (m3 !== undefined) a.push(m3);
                    return ''; // Return empty string.
                });
            // Handle special case of empty last value.
            if (/,\s*$/.test(text)) a.push('');
            return a;
        };

        csv = csv.split(/\n/);
        
        var countries = {},
            mapChart,
            countryChart,
            numRegex = /^[0-9\.]+$/,
            quoteRegex = /\"/g,
            categories = CSVtoArray(csv[1]).slice(4);

        // Parse the CSV into arrays, one array each country
        $.each(csv.splice(2), function () {
            var row = CSVtoArray(this),
                data = row.slice(4);

            $.each(data, function (i, val) {
                
                val = val.replace(quoteRegex, '');
                if (numRegex.test(val)) {
                    val = parseInt(val);
                } else if (!val) {
                    val = null;
                }
                data[i] = val;
            });
            countries[row[1]] = {
                name: row[0],
                code3: row[1],
                data: data
            };
        });

        // For each country, use the latest value for current population
        var data = [];
        for (var code3 in countries) {
            var value = null,
                year,
                itemData = countries[code3].data,
                i = itemData.length;

            while (i--) {
                if (typeof itemData[i] === 'number') {
                    value = itemData[i];
                    year = categories[i];
                    break;
                }
            }
            data.push({
                name: countries[code3].name,
                code3: code3,
                value: value,
                year: year
            });
        }
        // Add lower case codes to the data set for inclusion in the tooltip.pointFormat
        $.each(Highcharts.maps.world, function () {
            this.flag = this.code.toLowerCase();
            this.id = this.code; // for Chart.get()
        });

        // Wrap point.select to get to the total selected points
        Highcharts.wrap(Highcharts.Point.prototype, 'select', function (proceed) {

            proceed.apply(this, Array.prototype.slice.call(arguments, 1));

            var points = mapChart.getSelectedPoints();

            if (points.length) {
                if (points.length === 1) {
                    $('#info #flag').attr('class', 'flag ' + points[0].flag);
                    $('#info h2').html(points[0].name);
                } else {
                    $('#info #flag').attr('class', 'flag');
                    $('#info h2').html('Comparing countries');

                }
                $('#info .subheader').html('<h4>Historical population</h4><small>Shift + Click on map to compare countries</small>')

                if (!countryChart) {
                    countryChart = $('#country-chart').highcharts({
                        chart: {
                            height: 250,
                            spacingLeft: 0
                        },
                        credits: {
                            enabled: false
                        },
                        title: {
                            text: null
                        },
                        subtitle: {
                            text: null
                        },
                        xAxis: {
                            tickPixelInterval: 50,
                            crosshair: true
                        },
                        yAxis: {
                            title: null,
                            opposite: true
                        },
                        tooltip: {
                            shared: true
                        },
                        plotOptions: {
                            series: {
                                animation: {
                                    duration: 500
                                },
                                marker: {
                                    enabled: false
                                },
                                threshold: 0,
                                pointStart: parseInt(categories[0]),
                            }
                        }
                    }).highcharts();
                }

                $.each(points, function (i) {
                    // Update
                    if (countryChart.series[i]) {
                        /*$.each(countries[this.code3].data, function (pointI, value) {
                            countryChart.series[i].points[pointI].update(value, false);
                        });*/
                        countryChart.series[i].update({
                            name: this.name,
                            data: countries[this.code3].data,
                            type: points.length > 1 ? 'line' : 'area'
                        }, false);
                    } else {
                        countryChart.addSeries({
                            name: this.name,
                            data: countries[this.code3].data,
                            type: points.length > 1 ? 'line' : 'area'
                        }, false);
                    }
                });
                while (countryChart.series.length > points.length) {
                    countryChart.series[countryChart.series.length - 1].remove(false);
                }


                countryChart.redraw();
            } else {
                $('#info #flag').attr('class', '');
                $('#info h2').html('');
                $('#info .subheader').html('');
                if (countryChart) {
                    countryChart = countryChart.destroy();
                }
            }

            

        });
        
        // Initiate the chart
        mapChart = $('#container').highcharts('Map', {
            
            title : {
                text : 'Population history by country'
            },

            subtitle: {
                text: 'Source: <a href="http://data.worldbank.org/indicator/SP.POP.TOTL/countries/1W?display=default">The World Bank</a>'
            },

            mapNavigation: {
                enabled: true,
                buttonOptions: {
                    verticalAlign: 'bottom'
                }
            },

            colorAxis: {
                type: 'logarithmic',
                endOnTick: false
            },

            series : [{
                data : data,
                mapData: Highcharts.maps.world,
                joinBy: 'code3',
                name: 'Current population',
                allowPointSelect: true,
                cursor: 'pointer',
                states: {
                    select: {
                        color: '#BADA55',
                        borderColor: 'black',
                        dashStyle: 'shortdot'
                    }
                }
            }]
        }).highcharts();

        // Pre-select a country
        mapChart.get('US').select();
    });
});