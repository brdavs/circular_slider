/**
 * Creates a single instance of a slider
 * @param {String} id - Id of the html container to host the SVG drawing
 * @param {Object} data - Constructor for the multi slider
 * @return {object} Returns the built SVG dom node.
 */
function slider(id, data) {

    // Add data to self
    // for(k in data) {
    //     if(data.hasOwnProperty(k)) this[k] = data[k];
    // }

    // Reverse sort by size (larger first)
    data = data.sort(function(a, b) {
        return a.size < b.size ? 1 : -1;
        if(a.size == b.size) return 0;
    });
    // Global max size
    var max_size = data[0].size;
    // An array to hold all sliders
    var sliders = this.sliders = [];
    // Global mouse coordinates
    var mouse = {}

    /**
     * Calculates angle between 3 points in degrees
     * @param [Object] a, b, c - Coordinates of the first point
     * @param [Object] a.x, b.x, c.x - Integer x axis
     * @param [Object] a.y, b.y, c.y - Integer y axis
     * @return {Integer} Returns angle between 3 points in degrees
     */
    function find_angle(a,b,c) {
        var ab = Math.sqrt(Math.pow(b.x-a.x,2)+ Math.pow(b.y-a.y,2));    
        var bc = Math.sqrt(Math.pow(b.x-c.x,2)+ Math.pow(b.y-c.y,2)); 
        var ac = Math.sqrt(Math.pow(c.x-a.x,2)+ Math.pow(c.y-a.y,2));
        var rads = Math.acos((bc*bc+ab*ab-ac*ac)/(2*bc*ab));
        var degrees = rads * 180 / Math.PI;
        return a.x < c.x ? degrees : 180 - degrees + 180;
}   

    /**
     * Converts polar to cartesian coordinates
     * @param [Integer] cX - X axis of the circle
     * @param [Integer] cY - Y axis of thecircle
     * @param [Integer] radius - Radius of the circle
     * @param [Integer] degrees - 
     * @return {Object} Returns object with cartesian coordinates of a point
     */
    function polarToCartesian(cX, cY, radius, degrees) {
        var radians = (degrees-90) * Math.PI / 180.0;
        return {
            x: cX + (radius * Math.cos(radians)),
            y: cY + (radius * Math.sin(radians))
        };
    }
    
    /**
     * Describes a SVG arc (d attribute)
     * @param {Integer} x - X axis coordinate for arc center
     * @param {Integer} y -  Y axis coordinate for arc center
     * @param {Integer} radius - Eadius of the arc
     * @param {Integer} startAngle - Start od the arc
     * @param {Integer} endAngle - End of the arc
     * @return {String} Returns d attribute of a SVG arc
     */
    function describeArc(x, y, radius, startAngle, endAngle){
        var start = polarToCartesian(x, y, radius, endAngle);
        var end = polarToCartesian(x, y, radius, startAngle);
        var largeArcFlag = endAngle + startAngle <= 180 ? 0 : 1;
        var d = [
            "M", start.x, start.y, 
            "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y 
        ].join(" ");
        return d;       
    }

    /**
     * Get position for center of element on html canvas
     * @param {Object} el - Html object already in DOM
     * @return {Object} Returns coordinates of the center of the object
     */
    function pos(el) {
        var rect = el.getBoundingClientRect();
        return {
            x: rect.width/2 + rect.left,
            y: rect.height/2 + rect.top
        }
    }
    
    /**
     * Builds a single slider
     * @param {Object} data - Object constructor
     * @return {Object} Html object with additional data
     */
    function mk_slider(data) {
        // Array for holding arcs
        var arcs = [
            data.bg_color,
            data.bg_gap_color,
            data.color,
            data.gap_color
        ];
        
        // Replace every color with it's own arc
        for(var i = 0; i < arcs.length; i++) {
            
            var path =  {
                el: "path",
                attr: {
                    fill: "none",
                    stroke: arcs[i],
                    class: i < 2 ? 'circle circle_'+i : 'arc arc_'+i,
                    "stroke-width": data.width,
                    "stroke-dasharray": Math.abs(i % 2) == 1 ? [
                        data.dash,
                        data.gap
                    ] : "",
                    d: describeArc(
                        max_size/2,
                        max_size/2,
                        data.size/2-data.width/2-2,
                        i < 2 ? 359.9 : 0.1,
                        0
                    ),
                }
            };

            arcs[i] = path;
        }

        // Create a handle
        var handle = ce({
            el: "circle",
            attr: {
                class: "handle",
                cx: max_size/2, 
                cy: max_size/2, 
                r: data.width/2+2,
                transform: "translate(0 0)",
                fill: "#fff",
                stroke: "#000",
                "stroke-width": 1,
            }
        });

        var init_pos = polarToCartesian(
            data.size/2, 
            data.size/2, 
            data.size/2, 0
        )

        // Translate the handle into initial position
        handle.transform.baseVal.getItem(0).setTranslate(
            init_pos.y,
            -(init_pos.x-data.width/2-2)
        );

        // Return a group of sliders and handle
        var out = ce({
            el: "g",
            attr: {class: "slider"},
            content: arcs.concat(handle)
        });

        // Add slider data to the object for later reference
        out.slider_data = {data: data}

        return out;
    }

    // Fill the sliders up with 1 slider for now
    data.forEach(function(item) {
        sliders.push(
            mk_slider(item)
        );
    });

    

    // Create SVG --------------------------------------------------------------
    var svg = ce({
        el: "svg",
        attr: {
            width: data[0].size, 
            height: data[0].size, 
            id: data.id, 
            viewbox:"0 0 "+[data[0].size, data[0].size].join(' ')
        },
        content: this.sliders
    });
    var svg = this.svg = svg;

    // Append to an element and size that element accordingly
    var element = document.getElementById(id)
    element.appendChild(svg);
    element.style.width = data[0].size+"px";
    element.style.height = element.style.width;

    var XXXXX = document.getElementById('test')


    // Movement and actions ----------------------------------------------------

    // For all sliders gather data set up movement
    this.sliders = this.sliders.map(function(sl) {
        
        var handle = sl.getElementsByClassName("handle")[0];
        
        sl.slider_data.rotating = false;
        sl.slider_data.halt = '';
        sl.slider_data.c = pos(svg);
        sl.slider_data.a = pos(handle);
        sl.slider_data.m = pos(handle);
        sl.slider_data.angle =  find_angle(
            sl.slider_data.a,
            sl.slider_data.c,
            sl.slider_data.m
        );
        sl.slider_data.handle_pos = polarToCartesian(
            sl.slider_data.data.size,
            sl.slider_data.data.size,
            sl.slider_data.data.size/2-sl.slider_data.data.width/2-2, sl.slider_data.angle
        );

        // Set up for rotation
        handle.addEventListener('mousedown', function(e) {
            sl.slider_data.rotating =  true;
        }, false);
        handle.addEventListener('touchstart', function(e) {
            sl.slider_data.rotating =  true;
        }, false);

        // Jump to location
        sl.addEventListener('mousedown', function(e) {
            move_handle(e, sl);
        }, false);

        return sl;
    });

    // On mouse up stop rotation
    document.addEventListener('mouseup', function(e) {
        sliders = sliders.map(function(sl) {
            sl.slider_data.rotating = false;
            return sl;
        });
    }, false);

    // Track and fix positions suring movement
    document.addEventListener('mousemove', move_handle, false);
    document.addEventListener('touchmove', move_handle, false);

    /**
     * Acts on handle being moved
     * @param {Object} e - Event object
     * @param {Object} Html object with additional data
     * @return {undefined}
     */
    function move_handle(e, sl) {

        // Mouse position
        if(e.type=="touchmove") {
            mouse.x = e.touches[0].clientX;
            mouse.y = e.touches[0].clientY;
        } else {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        }

        // If We get just 1 element, we move just that one
        sliders = sl ? [sl] : sliders;

        sliders.forEach(function(sl) {

            // Just do nothing if we are not rotating or nobody clicked
            if(!sl.slider_data.rotating && 
            ['mousedown', 'touchmove'].indexOf(e.type) == -1) {
                return;
            };

            // Get angle and other stuff
            var hnd = sl.getElementsByClassName("handle")[0];
            sl.slider_data.m = {x: mouse.x, y: mouse.y };
            var d = sl.slider_data;
            var dd = sl.slider_data.data;
            var angle = sl.slider_data.angle = find_angle(d.a, d.c, d.m); 
            var cartesian_position = sl.slider_data.handle_pos = polarToCartesian(
                dd.size,
                dd.size,
                dd.size/2-dd.width/2-2, angle
            );

            // Moving the handle
            hnd.transform.baseVal.getItem(0).setTranslate(
                cartesian_position.x - dd.size,
                cartesian_position.y - dd.size
            );

            // Opening the arcs
            var arcs = sl.getElementsByClassName("arc");
            for(var i=0; i<arcs.length; i++) {
                arc_data = describeArc(
                    max_size/2,
                    max_size/2,
                    dd.size/2-dd.width/2-2,
                    angle,
                    0
                )
                arcs[i].setAttribute("d", arc_data);
            }

        });
    }
}


/**
 * Creates a SVG node structure from static data
 * @param {object} data - constructor object
 * @param {string} data.el - tag name to construct
 * @param {Object} data.attr - attributes in name value pairs
 * @param {String|Object|String[]|Object[]} data.content - A similar constructor or array of them
 * @returns {object} Returns the built SVG dom node.
 */
function ce(data) {
    
    // Create node and ad a namespace to it
    var node = document.createElement(data.el)
    node = document.createElementNS("http://www.w3.org/2000/svg", data.el);

    // Get all attributes to the node
    for(k in data.attr) {
        if(data.attr.hasOwnProperty(k)) node.setAttribute(k, data.attr[k]);
    }
    // If we do not have data, content, just exit
    if(!data.content) return node;

    // if content is provided, make sure that it's in an array
    if(!(data.content.constructor === Array)) data.content = [data.content];

    // Process the array
    data.content.forEach(function(item) {
        // if an element is a string
        if(typeof item === 'string') {
            n_item = document.createTextNode(item);
        } else {
            n_item = item.attributes ? item : ce(item);
        }
        node.appendChild(n_item);
    });

    return node;
}

