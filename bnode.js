//export {BNode}
const BNode ={}
BNode.Nodes = {} 			//all defined nodes
BNode.nodelist = [] 	//node instances

BNode.init = function() {
	BNode.Nodes = {}
	BNode.nodelist = [] 
}
// node base class 
BNode.Node =
	function(param) {
		this.insock = {} // ::socket
		this.outsock = {} // ::socket
		this.joints = null 
		this.evaled = null
		this.doeval = true 
		this.evalonce = false 
		if(param) {
			if(param.evalonce!==undefined) this.evalonce = param.evalonce 
		}
	}

BNode.Node.prototype.setjoint = function(joint) {
	this.joints = joint 
}
BNode.Node.prototype.eval = function(value) {
		if(!this.doeval || this.evaled) {
//			console.log("eval skip "+this.name+" "+this.id)
			return false
		}
//		console.log("eval "+this.name+" "+this.id)
		this.evaled = true 
		if(this.evalonce) this.doeval = false 
		this.getinnode()
		return true
	}

BNode.Node.prototype.getinnode = function() {
	for(let n in this.insock) {
//		console.log("get sock ",n)
		if(this.insock[n]===undefined) continue 
		if(this.insock[n].delayed) {
//			console.log("deleyed")
			continue
		} 
		const tj = this.joints[n]
		if(tj) {
			if(tj.parent.eval) tj.parent.eval() 
			this.insock[n].value = tj.value 
		}
	}
}

//joint socket class
BNode.Socket =function(name,parent,dir="out",type= "scalar",delayed=false) {
		this.name = name 
		this.dir = dir 
		this.type = type 
		this.value = null 
		this.parent = parent 
		this.delayed = delayed 
		this.joints = [] 
	}
	
BNode.Socket.prototype.setval = function(val) {
		this.value = val 
	}
BNode.Socket.prototype.getval = function() {
		return this.value 
	}
BNode.Socket.prototype.setjoint = function(joint) {
		this.joints.push(joint)
	}

//register new node 
BNode.registerNode = function(type,prot,methods) {
	//constructor function
	let node = function(param) {
		BNode.Node.call(this,param)	//call base constructor
		prot.call(this,param)		//call constructor
		for(let m in methods) {	//add methods
			node.prototype[m] = methods[m] 
		}
	}
	// prototype inherit 
	node.prototype = Object.create(BNode.Node.prototype)
	node.prototype.constructor = BNode.Node
	BNode.Nodes[type] = node 
}

//create node instance
BNode.createNode = function(type,param,id) {
	const n = new BNode.Nodes[type](param)
	n.id = id 
	if(param && param.default) {
		for(let v in param.default) {
			n.insock[v].setval(param.default[v])
		}
	}
	console.log(n)
	BNode.nodelist.push(n)
	return n 
}

//make node tree from data
BNode.mknode = function(data) {
	const nodes = {}
	for(let i=0;i<data.length;i++) {
		const n = data[i]
		const ni = {obj:BNode.createNode(n.nodetype,n.param,data[i].id),id:data[i].id}
		if(ni) nodes[ni.id] = ni 
	}
	for(let i=0;i<data.length;i++) {
		if(!data[i].joint) continue 
		const jo = data[i].joint 
		for(let j in jo) {
			const jn = jo[j].split(".")
			if(nodes[jn[0]]==undefined) {
				throw("joint error")
			}
			else jo[j] = (jn[1]=="result")?nodes[jn[0]].obj.result:nodes[jn[0]].obj.outsock[jn[1]] 
		}
		nodes[data[i].id].obj.setjoint(jo)
	}
//	console.log(nodes)
	return nodes 
}

// clear eval flag
BNode.clearEval = function() {
	for(let i in BNode.nodelist) BNode.nodelist[i].evaled = false 
}

// node library definition
BNode.regist = function(THREE) {
	BNode.registerNode("Mesh",
		function(param){
			this.name = "Mesh"
			this.param = param 
			this.shape = param.shape 
			this.outsock['result'] = new BNode.Socket("result",this,"out","mesh")
			this.result = this.outsock.result
		},
		{
			"eval":function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				let mesh 
				const param = this.param 
				if(param.mesh ) {
					mesh = param.mesh 
				} else {
				let geometry 
				const radius = (param.radius===undefined)?1:param.radius 
				const segment = (param.segment===undefined)?32:param.segment 
				const height = (param.height===undefined)?radius*2:param.height
				switch(this.shape) {
					case "sphere":
						geometry = new THREE.SphereGeometry( radius,segment,segment/2 );
						break ;
					case "cube":
						geometry = new THREE.BoxGeometry( radius,radius,radius );
						break 
					case "cone":
						let cheight = radius*2
						if(param.height!==undefined) rtop = param.height
						geometry = new THREE.ConeGeometry(radius,cheight,segment)
						break;
					case "cylinder":
						let rtop = radius
						let rbot = radius
						if(param.radiustop!==undefined) rtop = param.radiustop
						if(param.radiusbottom!==undefined) rtop = param.radiusbottom
						if(param.height!==undefined) rtop = param.height
						geometry = new THREE.CylinderGeometry(rtop,rbot,height,segment)
						break
					case "capsule":
						geometry = new THREE.CapsuleGeometry(radius,height,4,segment)					
						break ;
					case "torus":
						let tube = 0.2 
						let tubeseg = 64
						if(param.tuberatio!==undefined) tube = param.tuberatio
						if(param.tubeseg!==undefined) tubeseg = param.tubeseg
						geometry = new THREE.TorusGeometry(radius,radius*tube,segment,tubeseg)
						break
					case "icosa":
						geometry = new THREE.IcosahedronGeometry(radius)
						break 
					case "octa":
						geometry = new THREE.OctahedronGeometry(radius)
						break
					case "dodeca":
						geometry = new THREE.DodecahedronGeometry(radius)
						break 
				}
				const material = new THREE.MeshStandardMaterial( { color: 0xffffff } );
				mesh = new THREE.Mesh( geometry, material );
				}
				this.result.setval(mesh)				
			}
		}
	)
	BNode.registerNode("Value",
		function(param){
			this.name = "Value"
			this.value = param.value 
			this.outsock['result'] = new BNode.Socket("result",this,"out","scalar")
			this.outsock.result.setval(this.value) 
			this.result = this.outsock.result
		},
		{
			"setval":function(v) {
				this.value = v
			},
			"eval":function(v) {
				if(!BNode.Node.prototype.eval.call(this)) return 
				this.outsock.result.setval(this.value)  
			}
		}
		)

	BNode.registerNode("Timer",
		function(param){
			this.name = "Timer"
			this.value = null
			this.stime =  new Date().getTime()
			this.dtime = 0
			this.outsock['result'] = new BNode.Socket("result",this,"out","scalar")
			this.outsock['delta'] = new BNode.Socket("delta",this,"out","scalar")
			this.result = this.outsock.result
		},
		{
			"eval":function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				const v = (new Date().getTime() - this.stime )
				this.outsock.result.setval(v)
				this.outsock.delta.setval(v-this.dtime)
				this.dtime = v 
			}
		}
		)
	BNode.registerNode("Input",
		function(param){
			this.name = "Input"
			this.input = param.input 
			for(let k in this.input) {
				this.outsock[k] = new BNode.Socket(k,this,"out","scalar")
			}
			this.output = {} 
			POXA.setUIproperty(this,this.input,p=>{
				this.output[p.key] = p.value 
			})
		},{
			eval:function() {
				for(let k in this.input) {
					this.outsock[k].setval(this.output[k])
				}
			}
		}
	)

	BNode.registerNode("CreateInstance",
		function(param){
			this.name = "CreateInstance"
			this.insock['mesh'] = new BNode.Socket("mesh",this,"in","mesh")
			this.insock['count'] = new BNode.Socket("count",this,"in","scalar")
			this.outsock['instance'] = new BNode.Socket("instance",this,"out","instance")
			this.outsock['index'] = new BNode.Socket("index",this,"out","scalar")
			this.outsock['iindex'] = new BNode.Socket("iindex",this,"out","scalar")
			this.outsock['count'] = new BNode.Socket("count",this,"out","scalar")
		},{
			"eval":function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				const count = this.insock.count.value
				const mesh = this.insock.mesh.value 
				let inst = new THREE.InstancedMesh( mesh.geometry, mesh.material,count )
				let idx = []
				let iidx = []

				for(let i=0;i<count;i++) {
					idx.push(i) 
					iidx.push(i/count)
				}
				this.outsock.count.setval(count)
				this.outsock.instance.setval(inst)
				this.outsock.index.setval(idx)
				this.outsock.iindex.setval(iidx)
			}
		}
		)
	BNode.registerNode("InstanceMatrix",
		function(param) {
			this.name = "InstanceMatrix"
			this.insock['instance'] = new BNode.Socket("instance",this,"in","instance")
			this.insock['scale'] = new BNode.Socket("scale",this,"in","vec3")
			this.insock['euler'] = new BNode.Socket("euler",this,"in","vec3")
			this.insock['matrix'] = new BNode.Socket("matrix",this,"in","mat4")
			this.insock['translate'] = new BNode.Socket("translate",this,"in","vec3")
			this.outsock['instance'] = new BNode.Socket("instance",this,"out","instance")
			this.result = this.outsock['instance'] 
		},
		{
			"eval":function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				const mtx = new THREE.Matrix4() 
				const mtx1 = new THREE.Matrix4()
				const mtx2 = new THREE.Matrix4()
				const mtx3 = new THREE.Matrix4()
				
				const ini = this.insock.instance.getval()
				let bmtx = this.insock.matrix.getval()
				if(bmtx===null) bmtx = new THREE.Matrix4() 
				const ins = this.insock.scale.getval()
				const ine = this.insock.euler.getval()
				const intr = this.insock.translate.getval()
				let count = 1000000
				if(ins && ins.length<count) count = ins.length
				if(ine && ine.length<count) count = ine.length
				if(intr && intr.length<count) count = intr.length
				for(let i=0;i<count;i++) {
					mtx.copy(bmtx)
					if(ins) {
						const sc = (Array.isArray(ins[i])?ins[i]:[ins[i],ins[i],ins[i]])
						mtx.premultiply(mtx3.makeScale(...sc))
					}
					if(ine) {
						mtx.premultiply(mtx1.makeRotationFromEuler(new THREE.Euler(...ine[i])))
					}
					if(intr) {
						const tr = (Array.isArray(intr[i])?intr[i]:[intr[i],intr[i],intr[i]])
						mtx.premultiply(mtx2.makeTranslation(...tr))
					}
					ini.setMatrixAt( i, mtx )
				}
				ini.count = count 
				this.result.setval(ini)
			}	
		}
		)
	BNode.registerNode("InstanceColor",
		function(param) {
			this.name = "InstanceColor"
			this.insock['instance'] = new BNode.Socket("instance",this,"in","instance")
			this.insock['rgb'] = new BNode.Socket("rgb",this,"in","vec3")
			this.insock['hsl'] = new BNode.Socket("hsl",this,"in","vec3")
			this.outsock['instance'] = new BNode.Socket("instance",this,"out","instance")
			this.result = this.outsock['instance'] 
		},
		{
			"eval":function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				const oi = []
				const ini = this.insock.instance.getval()
				const rgb = this.insock.rgb.getval()
				const hsl = this.insock.hsl.getval()
				const col = new THREE.Color()
				for(let i=0;i<ini.count;i++) {
					if(rgb) col.setRGB(...(rgb[i]))
					else if(hsl) col.setHSL(...(hsl[i]))
					ini.setColorAt(i,col)
				}
				this.result.setval(ini)	
			}	
		}
		)

	BNode.registerNode("Math",
		function(param){
			this.name = "Math"
			let precode = ( param.precode)?param.precode:""
			if(Array.isArray(precode)) precode = precode.join("")
			this.result = {} 
			this.funcs = {} 
			for(let n in param.input) {
				this.insock[n] = new BNode.Socket(n,this,"in",param.input[n].type)	
			}
			this.invalue = [...Object.keys(this.insock)] 
			for(let n in param.output) {
				let code = param.output[n].value
				if(Array.isArray(code)) {
					code = "["+code.join(",")+"]"
				}
				this.outsock[n] = new BNode.Socket(n,this,"out",param.output[n].type)	
				this.funcs[n] = new Function(...this.invalue,"allinput","index",'"use strict";'+precode+"; return "+code )
			}
			this.result = this.outsock.result
		},{
			eval:function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				let ic = 0 
				for(let n in this.insock) {
					const v = this.insock[n].value 
					if(Array.isArray(v) && v.length>ic) ic=v.length  
				}
						
				const fn = this.funcs['result']
				let result 
				if(ic>0) {
					result = [] 
					allinput = {}
					for(let n in this.insock) {
						allinput[n] = this.insock[n].value
					}
					for(let i=0;i<ic;i++) {
						const val = [] 
						for(let n in allinput) {
							const v = allinput[n]
							if(Array.isArray(v)) {
								if(v.length<ic) val.push(v[i%v.length])
								else val.push(v[i])
							}
							else val.push(v) 
						}
						const ret = (fn).call(this,...val,allinput,i)
						if(ret!==null) result.push(ret)
					}
				} else {
					const val = [] 
					for(let n in this.insock) {
						const v = this.insock[n].value
						val.push(v) 
					}
					result = (fn).call(this,...val,null,0)				
				}
//				console.log("result ",result)
				this.outsock.result.setval(result)
			}
		}
	)

	BNode.registerNode("ScaleMatrix",
		function(param) {
			this.name = "ScaleMatrix"
			this.insock['scale'] = new BNode.Socket("scale",this,"out","vec3")
			this.insock['matrix'] = new BNode.Socket("matrix",this,"out","mat4")
			this.outsock['matrix'] = new BNode.Socket("matrix",this,"out","mat4")
			this.result = this.outsock['matrix'] 
		},
		{
			eval:function() {
				
			}
		}
	)
	BNode.registerNode("Output",
		function(param){
			this.name="Output"
			this.insock['mesh'] = new BNode.Socket("mesh",this,"in","mesh")
			this.outsock['mesh'] = new BNode.Socket("mesh",this,"out","mesh")
			this.result = this.outsock.mesh
		},
		{
			eval:function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				this.outsock.mesh.setval(this.insock.mesh.getval())
			}
		}
	)

	BNode.registerNode("Delay",
		function(param){
			this.name = "Delay"
			this.insock['input'] = new BNode.Socket("input",this,"in","any",true)
			this.outsock['result'] = new BNode.Socket("result",this,"out","any")
			this.result = this.outsock.result
			this.vstack = null
		},
		{
			"eval":function(v) {
				if(!BNode.Node.prototype.eval.call(this)) return 
				let out = null 
				if(this.vstack!==null) out = structuredClone(this.vstack) 
				this.outsock.result.setval(out)
			},
			"posteval":function() {
				this.vstack = structuredClone(this.joints.input.getval())				
			}
		}
		)	
	BNode.registerNode("MeshMatrix",
		function(param) {
			this.name = "MeshMatrix"
			this.insock['mesh'] = new BNode.Socket("mesh",this,"in","instance")
			this.insock['scale'] = new BNode.Socket("scale",this,"in","vec3")
			this.insock['euler'] = new BNode.Socket("euler",this,"in","vec3")
			this.insock['matrix'] = new BNode.Socket("matrix",this,"in","mat4")
			this.insock['translate'] = new BNode.Socket("translate",this,"in","vec3")
			this.outsock['mesh'] = new BNode.Socket("mesh",this,"out","instance")
			this.result = this.outsock['mesh'] 
		},
		{
			"eval":function() {
				if(!BNode.Node.prototype.eval.call(this)) return 
				const mtx = new THREE.Matrix4() 
				const mtx1 = new THREE.Matrix4()
				const mtx2 = new THREE.Matrix4()
				const mtx3 = new THREE.Matrix4()
				
				let ini = this.insock.mesh.getval()
				let bmtx = this.insock.matrix.getval()
				if(bmtx===null) bmtx = new THREE.Matrix4() 
				const ins = this.insock.scale.getval()
				const ine = this.insock.euler.getval()
				const intr = this.insock.translate.getval()
		
					if(ins) {
						const sc = Array.isArray(ins)?ins:[ins,ins,ins]
						ini.scale.copy(new THREE.Vector3(...ins))
					}
					if(ine) {
						ini.setRotationFromEuler(new THREE.Euler(...ine))
					}
					if(intr) {
						const tr = Array.isArray(intr)?intr:[intr,intr,intr]
						ini.position.copy(new THREE.Vector3(...tr))
					}

				this.result.setval(ini)
			}	
		}
		)

}
BNode.evalnode = function(nodes) {
	const result = [] 
	for(let n in nodes) {
		const node = nodes[n].obj
		if(node.name=="Output") {
			node.eval() 
			result.push(node.result.value)
		}
	}
	for(let n in nodes) {
		const node = nodes[n].obj	
		if(node.posteval) {
			node.posteval() 
		}
		node.evaled = false 
	}
	for(let i=0;i<result.length;i++) {
		if(result[i].instanceMatrix) result[i].instanceMatrix.needsUpdate = true;
		if(result[i].instanceColor) result[i].instanceColor.needsUpdate = true;
	}
	return result 
}


BNode.createMesh = function(shape="sphere") {
	const m = new BNode.Nodes['Mesh'](shape)
	console.log(m)
	BNode.nodelist.push(m)
	return m 
}
BNode.createValue = function(value=0) {
	const m = new BNode.Nodes['Value'](value)
	console.log(m)
	BNode.nodelist.push(m)
	return m
}
BNode.createTimer = function(value=0) {
	const m = new BNode.Nodes['Timer']()
	console.log(m)
	BNode.nodelist.push(m)
	return m
}
BNode.createInstance = function(param) {
	const m = new BNode.Nodes['CreateInstance'](param)
	console.log(m)
	BNode.nodelist.push(m)
	return m
}
BNode.createMath = function(param) {
	const m = new BNode.Nodes['Math'](param)
	console.log(m)
	BNode.nodelist.push(m)
	return m
}
BNode.createMatrix = function(param) {
	const m = new BNode.Nodes['InstanceMatrix'](param)
	console.log(m)
	BNode.nodelist.push(m)
	return m
}
BNode.createColor = function(param) {
	const m = new BNode.Nodes['InstanceColor'](param)
	console.log(m)
	BNode.nodelist.push(m)
	return m
}