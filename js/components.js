// add title and descriptions
function addtitledesc (){
	// add the h2 title
	d3.select('body')
	.append('h2')
	.text('D3 try ' + window.location.href)
	;

	d3.select('body')
	.append('p')
	.text('commit 8- to https://github.com/junkthem/simple_d3tree_v3tov4.io ')
}

/* This part is to load json str and save to a sessionStorage item. That way to avoid the async issue
	the trick is to get json object by d3.json(), and save into a sessionStorage item
	This is the only way I know that works in getting the stringified json out of d3.json()
*/
function loadjson (url) {
	d3.json(url, function(err, srcjson) {
		if (err) throw error;
		// var jsonstr = JSON.stringify(srcjson)
		tmptxt=JSON.stringify(srcjson);
		//console.log(tmptxt)
		sessionStorage.setItem("loadedjsonstr", tmptxt);
		/*Note: the trick is to show the sessionStorage item in console.log
			if not show it in console.log, the reload will not be fired (started)*/
		console.log(sessionStorage.getItem("loadedjsonstr"))
		if (sessionStorage.getItem("loadedjsonstr") === null ){
			document.location.reload();
		}
	});
}


/** get the loaded jsonstr from a sessionStorage item, parse the jsonstr to a JSON obj, and save it to treeData
 * Note:
 * 1. the following code lines are in a function, can be put into the separate file (components.js), such to keep 
    the modules.js neat.  
 * 2. the function is in IFFE (Immediately invoked function expression) style (https://en.wikipedia.org/wiki/Immediately_invoked_function_expression)
	IFFE style can return values without asynchronous issues.
 */

const getJsonFromSessionStorage  = (function () {
	// 1. load json inot a sessionStorage item (loadedjsonstr)
	loadjson (treejsonURL); //Note: the loadjson() has to run within getJsonFromSessionStorage Otherwise the sessionStorage Item cannot properly work.
    /* again the trick is to show the sessionStorage item in console.log. If not, the sessionStorage item will be null
		and the page is not reloaded*/
    console.log(sessionStorage.getItem("loadedjsonstr"))
    if (sessionStorage.getItem("loadedjsonstr") === null ){
        document.location.reload();
    }
    var loadedjsonstr = sessionStorage.getItem("loadedjsonstr");
    // console.log(loadedjsonstr)
    sessionStorage.removeItem("loadedjsonstr")
    return JSON.parse(loadedjsonstr);
})()

/**add a new element */
function addnewEle (width, height, id, clss, theparent, parentEleType, EleType, transfm ) {
	if (theparent === null ) {
		theparent = d3.select(parentEleType);
	}
	//console.log(theparent)
	var newEle = theparent.append(EleType)
	//its size = the size of tree diagram + margins
	.attr("width", width)
	.attr("height", height )
	.attr("id", id)
	.attr("class", clss)
	.attr("transform", transfm)
	;
	return newEle;	
}

/*make and update tree */
function update(parentData) {

	//treeData2 is an instantiation of the class treemap().
	var treeData2 = treemap(root);	//v4

	// Compute the new tree layout.
	var nodes = treeData2.descendants(), links = treeData2.descendants().slice(1); //v4
	//links is almost the same as nodes, just removing the first element by slice(1) (the first element of nodes does not have a parent to link to)

	// redefine nodes.y, make it 180 apart from each other
	nodes.forEach(function(d) { d.y = d.depth * between_nodes_horizontal; });

	//join (link data to empty g elements)
	var node = g.selectAll("g.nodeGroup") // note that it is to select all elements within g with the classname = nodeGroup
		.data(nodes, function(d) { return d.id || (d.id = ++i); }); // each data point was assigned an id (d.id)

	//enter (add g elements according to joined node)
	var nodeEnter = node.enter().append("g")
		.attr("class", "nodeGroup")
		.attr("transform", function(d) {
			return "translate(" + parentData.y0 + "," + parentData.x0 + ")"; }) //each g are added at the position x0,y0 of the source data
		.on("click", click)
		.on('contextmenu', click2) // right click to zoom in/out
		;
		
	
	//add circle within g.nodeGroup
	nodeEnter.append("circle")
		.attr("r", 1e-6) // initial size is nearly 0
		.style("fill", function(d) {
			return d._children ? "lightsteelblue" : "#fff"; });
	
	// add text with g.nodegroup
	nodeEnter.append("text")
		.attr("x", function(d) { return d.children || d._children ? -13 : 13; }) // horizontal offset
		.attr("dy", ".85em") //vertical offset
		.attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
		.text(function(d) { return d.data.name; }) //v4
		.style("fill-opacity", 1e-6)
		.style("font-size", "0.01px")
		;
	
	// update (change properties of the g.nodegroup elements, including x/y coordinate, size, color, etc)
 	var nodeUpdate = nodeEnter.merge(node); // v4
	nodeUpdate.transition() //v4
		.duration(duration)
		.attr("transform", function(d) { 
			return "translate(" + d.y + "," + d.x + ")"; 
		});

	// update (change properties of the ciricle elements, including x/y coordinate, size, color, etc)
	nodeUpdate.select("circle")
		.transition().duration(duration)
		.attr("r", 10)
			.style(
			"fill", 
			function(d) { 
				return d._children ? "lightsteelblue" : "#fff"; 
			}
		);
	
	//update (change properties of the text elements, including x/y coordinate, size, color, etc)
	nodeUpdate.select("text")
		.transition().duration(duration)
		.style("fill-opacity", 1)
		.style("font-size", "20px")
		;
		
	/** exit g groups (For the elements that are not joined in node, make them travel back to the coordinate x y of 
	 * the parentData, then remove these unbinded elements)*/
	var nodeExit = node.exit()
		.transition()
		.duration(duration)
		.attr("transform", function(d) { 
			return "translate(" + parentData.y + "," + parentData.x + ")"; 
		})
		.remove();

	//exit text groups, shrine the radius of the circle to nearly 0
	nodeExit.select("circle")
		.attr("r", 1e-6);
		
	//exit text groups, changetext opacity to nearly 0, also reduce the font-size to nearly 0
	nodeExit.select("text")
		.style("fill-opacity", 1e-6)
		.style("font-size", "0.01px")
		;


	/*******************************make links *********************** */	

	// join (link data to empty path elements) 
	var link = g.selectAll("path.link")
		.data(links, function(d) { return d.id; }); //v4  d.id can befound in _enter => 0:q => __data .id, which is corresponding to the d.id in node object

	// enter (add path elements according to joined link)
	var linkEnter = link.enter().insert('path', "g") //v4
		.attr("class", "link")
		.attr("stroke-opacity", 1e-6)
		.attr("d", function(d) {
			var o = {x: parentData.x0, y: parentData.y0};
			return diagonal(o,o); //v4 // initially, let the s (source) and d(destination) coordinates of the path be the same: x0, y0 of the parentData
		});

	/* update (change waypoints of the path, 
		i.e., recalculating the path waypoints at any time during the transition) */
	var linkUpdate = linkEnter.merge(link); //d3v4
	linkUpdate.transition()
		.duration(duration)
		.attr("stroke-opacity", 1)
		.attr('d', function(d){ return diagonal(d.parent, d)}); 
		// attr('d', ..) is the final path after transition, it is from x,y coordinate of the parentnode to x,y of the current node

	// exit, make transition by changing the path waypoints towards the parent node, and eventually remove the path lines
	link.exit().transition()
		.duration(duration)
		.attr("stroke-opacity", 1e-6)
		.attr("d", function(d) {
			var o = {x: parentData.x, y: parentData.y};
			return diagonal(o, o); // v4 it is the final path after transition: all waypionts are at the x,y of the parentData	
		})
		.remove();
	
	/**update x0, y0 ********************************************************************************/
	// for each data element, update the x0 and y0 as the current d.x, and d.y, so as to toggle between expansion/collaspe
	nodes.forEach(function(d) {
		d.x0 = d.x;
		d.y0 = d.y;
	});
}


// the diagonal path
/******migration to D3V4 part 15*/
// var diagonal = d3.svg.diagonal().projection(function(d) {return [d.y, d.x];});//v3
// the diagonal() is no longer available, instead, make a diagonal function 
//diagnonal(s, d), i.e., s=source, d=destination.
function diagonal(s, d) {
	path = `M ${s.y} ${s.x}
			C ${(s.y + d.y) / 2} ${s.x},
			  ${(s.y + d.y) / 2} ${d.x},
			  ${d.y} ${d.x}`  
	return path
} // v4
/***end ***migration to D3V4 part 15*/

// Toggle children on click.
function click(d) {
	//console.log("a node is clicked");
	//console.log(d);
  if (d.children) {
	d._children = d.children;
	d.children = null;
  } else {
	d.children = d._children;
	d._children = null;
  }
  update(d);
}	



/**This is from the zooming part F:\Personal\Virtual_Server\PHPWeb\D3 Pan drop drag\DeniseMauldin Box*/
function zoomed() {
    svg.attr("transform", d3.event.transform);

	//this part is useless
    // this is intended to start the zoom at center where the current node is 
    // var transform = d3.event.transform,
    //     point = transform.invert(center_tree);
    //     console.log("point",point, "focus", focus)
    // transform = transform.translate(point[0] - focus[0], point[1] - focus[1]);
    // svg.attr("transform", transform);

}


/**add part 8, the click function */
  //click2 to zoomin
  function click2(d){
    //disable the default right click menu
    d3.event.preventDefault();

    //5.1.1 initialzie the vars for x, y coordinates, and the zoom levels
    var x; //x coordinate (horizontal) of the center of the selected path/shape to the left wall of the map g
    var y; // y coordinate (vertical)
    var xy_pathcenter; // an object containing data about the selected path/shape, including its x and y
    var translateStr; // a string to specify the travelling (i.e. translating) settings
    var zoomLevel; // the level of zoomming (scale, i.e., the times to enlarge/shrink)

    //5.1.2 determine the toggling settings (i.e., zoom in, select a new county, or zoom out)
    if (d && centeredNode !== d) {
        //a. if a different county is selected

        //5.1.2.a.1 get the center of the selected shape/path
		// var xy_pathcenter = path.centroid(d);
		console.log(d)
        y = d.x; //xy_pathcenter[0];
        x = d.y; //xy_pathcenter[1];

        //5.1.2.a.2 determine the string for zooming (scale)
        // the syntax is like 'scale(10)'
        zoomLevel = zoomSettings.zoomLevel;

        //5.1.2.a.3 update the centeredNode, i.e., let it be the currentl selected county
        centeredNode = d

    } else {
        //b. if the selection (click) is not on a new county (i.e., the same county, or a none-county area is clicked )
        // 5.1.2.b.1 set the x, y value as the center of the window
        ///**modified part 9, the following is different, */
        x = width_body / 2 - margin.left; //width1 / 2 ;
        y = height_body / 2 - margin.top ; // height2 /2;

        // 5.1.2.b.2 set the zoom level =1 (zoom out)
        zoomLevel = 1;

        // 5.1.2.b.3 nulify the var centeredNode 
        centeredNode = null;

    }

    //5.1.3 determine the string for travel (translate)
    // the syntax is like 'translate (221, 176)'
    var translate_mapUpperLeft='translate (' + width_body/2 + ',' + height_body/2 + ')'

    //5.1.4 determine the string for enlarge/shrink (scale)
    scaleStr = 'scale (' + zoomLevel + ')'

    //5.1.5 determine the offset 
    var translate_offsetSelectedPath='translate (' + -x  + ',' + -y + ')'

    //5.1.6 putting travelling and zooming together (translate and scale together)
    // the syntax is like translate (221, 176)scale(10)
    translateStr = translate_mapUpperLeft + scaleStr + translate_offsetSelectedPath

    //5.1.7 travel + zooming (i.e, translate + scale)
    g.transition()
        .duration(zoomSettings.duration)
        .ease(zoomSettings.ease) 
        .attr('transform', translateStr)
    ;

  }

