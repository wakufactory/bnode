const $ = id=>document.querySelector(id)

onload = function() {
		
	$('#base').style.width="2900px"
	$('#base').style.height="2000px"
	$('#size_x,#size_y').addEventListener('change',(ev)=>{
		$('#base').css(($(this).attr('id')=="size_x")?'width':'height',parseInt($(this).val())+"px") ;
	})
	const node = new Node() 
	const ne = new NEdit(node,$('#base'))
	node.editor = ne 

	$('#zoom').addEventListener("input",(ev)=> {
		ne.mag = ev.target.value/100 ;
		$('#szoom').innerHTML = ("#base {transform: scale("+ne.mag+")}");
	})
}

class Node {
constructor() {	
	this.joints = [] 
	this.nc = 1 
}
addnode(node,pos) {
	node.id = node.id
	this.nc++
//	console.log(node)
	this.editor.addnode(node,pos)
	return node.id 
}
nodemove(id,pos) {
	dlog(`move ${id} to ${pos[0]} ${pos[1]}`)
}
setjoint(id1,id2) {
	dlog(`joint ${id1} to ${id2}`)
	
	const j1 = id1.split("-")
	const j2 = id2.split("-")
	if(id1==id2) {
		this.removejoint(id1)
		return 
	}
	if(j1[1]=="i" && j2[1]=="i" || j1[1]=="o" && j2[1]=="o") return
	let j = [id1,id2]
	if(j1[1]=="i") j = [id2,id1]
	this.joints.push(j)
}
removejoint(id) {
	this.joints = this.joints.filter(j=>{
		return !(j[0]==id||j[1]==id) 
	})
}
drawjoint() {
	this.editor.drawalljoints(this.joints)
}
}//Node

function dlog(msg) {
	console.log(msg)
}
class NEdit {
constructor(node,baseelem) {
	this.base = baseelem 
	this.node = node 
	this.mag = 1.0 ;	
	this.cmenu = new CMenu(this.base,{
		title:"MENU",item:[
			{disp:"node1",id:"0"},
			{disp:"node2",id:"1"},
			{disp:"node3",id:"2"},
		]
	})
	this.nodemenu = new CMenu(this.base,{
		item:[
			{disp:"setting",id:"set"},
			{disp:"dupulicate",id:"dup"},
			{disp:"delete",id:"del"}
		]
	})
	this.setevent()
}
addnode(param,pos) {
	const b = this.base.querySelector('.nodes')
	const el = document.createElement("div")
	el.id = param.id 
	el.className = "box"
	el.style = `left:${pos[0]}px;top:${pos[1]}px`
	let str = []
	str.push(`<div class=head>${param.name}<span class="menu uibase">▼</span></div>`)
	str.push(`<div class=body>`)
	if(param.input) {
		str.push(`<div class=left>`)
		param.input.forEach(i=>{
			str.push(`<div><span class=joint id=${param.id}-i-${i.id}>●</span>${i.name}</div>`)
		})
		str.push(`</div>`)
	}
	if(param.body) str.push(`<div class=mid>${param.body.join("<br/>")}<div class=uibase></div></div>`)
	if(param.output) {
		str.push(`<div class=right>`)
		param.output.forEach(i=>{
			str.push(`<div>${i.name}<span class=joint id=${param.id}-o-${i.id}>●</span></div>`)
		})
		str.push(`</div>`)
	}

	str.push(`</div>`)
	str.push(`<div class=bottom>settings</div>`)
	el.innerHTML = str.join("\n")
	if(param.ui) {
		param.ui.forEach(ui=>{
			if(ui.caption) {
				const cap = document.createElement("span")
				cap.innerHTML = ui.caption
				el.querySelector("div.uibase").appendChild(cap)
			}
			el.querySelector("div.uibase").appendChild(ui.elem)	
			el.querySelector("div.uibase").appendChild(document.createElement("br"))		
		})
	}
	b.appendChild(el) 
	this.addnodeevnt(el)
}
setevent() {	
	const evm = (ev)=> {
		let ret = null
		if(ev.touches && ev.touches[0]) {
			ret = [ev.touches[0].clientX,ev.touches[0].clientY]
		} else if(ev.clientX!==undefined) {
			ret = [ev.clientX,ev.clientY]
		}
		return ret 
	}

	let drag = false 
	let target = null 
	let sa = null 
	let sp = null
	let mp = null 
	//set moved position
	const moveto = (o)=> {
//		console.log(o[0]+"/"+o[1])
		const pos = [sp[0]+o[0]/this.mag,sp[1]+o[1]/this.mag]
		target.style.left = pos[0]+"px"
		target.style.top =  pos[1]+"px"
		return pos 
	}
	// start drag 
	this.f_startdrag = (ev)=> {
		const em = evm(ev) 
		if(document.elementFromPoint(em[0], em[1]).classList.contains("mdg")) {
			 this.cmenu.hide()
			 this.nodemenu.hide()
		}
		if(!drag) return 
//		dlog("dstart")
		ev.preventDefault()
	}
	// dragging 
	this.f_movedrag = (ev)=> {
		if(!drag) return 
		const em = evm(ev) 
		if(em===null) return 
		mp = em 
		const o = [(mp[0]-sa[0]),(mp[1]-sa[1])]
		moveto(o)
//		dlog("dmove "+em[0]+"/"+em[1])
		this.node.drawjoint(this)
	}
	// drag end 
	this.f_enddrag = (ev)=> {
		if(!drag) return 
		const em = evm(ev) 
		if(em !==null) {
			mp = em 
		}
//		dlog("dend "+mp[0]+"/"+mp[1])
		const o = [mp[0]-sa[0],mp[1]-sa[1]]
		const pos = moveto(o)
		this.node.nodemove(target.id,pos)
		drag = false 
		target.classList.remove("drag")
		this.node.drawjoint(this)
	}
	// box clicked 
	this.f_clickbox = (ev)=> {
//		dlog("bclick")
		target = ev.target.closest("div.box") 
		sp = [target.offsetLeft,target.offsetTop]
		sa = evm(ev)
		drag = true 
		target.classList.add("drag")
		this.nodemenu.hide()
		ev.preventDefault()
	}
	const base = this.base 
	base.addEventListener("mousedown",this.f_startdrag)
	base.addEventListener("mousemove",this.f_movedrag)
	base.addEventListener("mouseup",this.f_enddrag)	
	base.addEventListener("touchstart",this.f_startdrag)
	base.addEventListener("touchmove",this.f_movedrag)
	base.addEventListener("touchend",this.f_enddrag)	
	base.querySelectorAll('.box').forEach(o=>{
		o.addEventListener("mousedown",this.f_clickbox)
		o.addEventListener("touchstart",this.f_clickbox)
	})

	this.f_uioff = (ev)=> {
		drag=false
		ev.stopPropagation()
	}
	base.querySelectorAll('.box .uibase').forEach(o=>{
		o.addEventListener("mousedown",this.f_uioff)
		o.addEventListener("touchstart",this.f_uioff)
	})
	
	let jmove = false 
	let jstart = null 
	let jpos = null 
	this.f_jdrag = (ev)=> {
		if(!jmove) return 
		const em = evm(ev) 
		if(em===null) return 
		jpos = em 
//		dlog("jdrag "+em[0]+"/"+em[1])
//		console.log("jm "+ev.pageX+"/"+ev.pageY)
		this.editjoint(jstart,{x:em[0],y:em[1]})		
	}
	this.f_jend = (ev)=> {
		if(!jmove) return 
//		dlog("jend")
		jmove = false 
		this.base.querySelector('svg.e_svg').innerHTML = ""		
	}
	base.addEventListener("mousemove",this.f_jdrag)
	base.addEventListener("mouseup",this.f_jend)
	base.addEventListener("touchmove",this.f_jdrag)
	base.addEventListener("touchend",this.f_jend)
	this.f_jdown = (ev)=> {
//		dlog("jstart")
		const em = evm(ev)
		if(em===null) return
		drag = false ;
		jmove = true 
		jstart = ev.target.id 
//		console.log("jstart "+ev.target.id)
		ev.stopPropagation()
		ev.preventDefault()
	}
	this.f_jup = (ev)=> {
		drag = false ;
		jmove = false 
		const tel = document.elementFromPoint(jpos[0], jpos[1])
//		dlog(jpos[0]+"/"+jpos[1]+":"+tel.id)
		if(tel.classList.contains("joint")) {
//			dlog("jup "+tel.id)
			this.node.setjoint(jstart,tel.id)
			this.node.drawjoint(this)		
		}
		jmove = false 
		this.base.querySelector('svg.e_svg').innerHTML = ""		
	}
	base.querySelectorAll('.box .joint').forEach(o=>{
		o.addEventListener("mousedown",this.f_jdown)
		o.addEventListener("mouseup",this.f_jup)
		o.addEventListener("touchstart",this.f_jdown)
		o.addEventListener("touchend",this.f_jup)
	})
	//contextmenu 
	this.base.addEventListener("contextmenu", ev=>{
		const em = evm(ev) 
		if(!document.elementFromPoint(em[0],em[1]).classList.contains("mdg")) return 
		this.cmenu.show([ev.offsetX,ev.offsetY])
		ev.preventDefault()
	})
	this.cmenu.callback = (m)=> {
		dlog(m.select+":"+m.pos[0]+"/"+m.pos[1])
		this.node.addnode(nodedata[m.select],m.pos)
	}
	//node menu
	this.f_nodemenu = ev=>{
		const em = evm(ev) 
		const b = this.base.getBoundingClientRect()
		const bound = ev.target.getBoundingClientRect()
		if(this.nodemenu.isshow) this.nodemenu.hide()
		else this.nodemenu.show([bound.x-b.x,bound.y-b.y+bound.height])
		this.target = ev.target.closest("div.box") 
		ev.preventDefault()
	}
	this.nodemenu.callback = (m)=> {
		dlog(m.select+":"+m.pos[0]+"/"+m.pos[1])
		switch(m.select) {
			case "set":
				const s = this.target.querySelector(".bottom").style
				s.display = (s.display=="block")?"none":"block" 
				break ;
		}
	}	
	base.querySelectorAll('.box .menu').forEach(o=>{
		o.addEventListener("click", this.f_nodemenu)
	})

}	
addnodeevnt(nodebox) {
	nodebox.addEventListener("mousedown",this.f_clickbox)
	nodebox.addEventListener("touchstart",this.f_clickbox)
	nodebox.querySelectorAll('.uibase').forEach(o=>{
		o.addEventListener("mousedown",this.f_uioff)
		o.addEventListener("touchstart",this.f_uioff)
	})
	nodebox.querySelectorAll('.joint').forEach(o=>{
		o.addEventListener("mousedown",this.f_jdown)
		o.addEventListener("mouseup",this.f_jup)
		o.addEventListener("touchstart",this.f_jdown)
		o.addEventListener("touchend",this.f_jup)
	})
	nodebox.querySelector('.menu').addEventListener("click", this.f_nodemenu)
}
editjoint(id1,m) {
	const b = this.base.getBoundingClientRect()
	const ii = id1.split("-")
	const j1 = $('#'+id1).getBoundingClientRect()
	const s = [(j1.x-b.x+j1.width/2)/this.mag,(j1.y-b.y+j1.height/2)/this.mag]
	const e = [(m.x-b.x)/this.mag,(m.y-b.y)/this.mag]
	const l = Math.hypot(e[0]-s[0],e[1]-s[1])
	const sofs = (ii[1]=="o"?1:-1)*l/2
	const svg = `<path d="M ${s[0]} ${s[1]} C ${s[0]+sofs} ${s[1]} ${e[0]-sofs} ${e[1]} ${e[0]} ${e[1]}">`
//	console.log(svg)
	this.base.querySelector('svg.e_svg').innerHTML = (svg)	
}
drawjoint(id1,id2) {
	const b = this.base.getBoundingClientRect()
	const j1 = $('#'+id1).getBoundingClientRect()
	const j2 = $('#'+id2).getBoundingClientRect()
	if(!j1 || !j2) return 
	const s = [(j1.x-b.x+j1.width/2)/this.mag,(j1.y-b.y+j1.height/2)/this.mag]
	const e = [(j2.x-b.x+j2.width/2)/this.mag,(j2.y-b.y+j2.height/2)/this.mag]
	const l = Math.hypot(e[0]-s[0],e[1]-s[1])
	const sofs = l/2
	const svg = `<path d="M ${s[0]} ${s[1]} C ${s[0]+sofs} ${s[1]} ${e[0]-sofs} ${e[1]} ${e[0]} ${e[1]}">`
//	console.log(svg)
	this.base.querySelector('svg.n_svg').innerHTML += (svg)
}
drawalljoints(joints) {
	this.base.querySelector('svg.n_svg').innerHTML = ""
	joints.forEach(j=>{
		this.drawjoint(j[0],j[1])
	})
}
}//NEdit

class CMenu {
constructor(base,menu) {
	this.base = base 
	this.el = document.createElement("div")
	this.el.className = "cmenu"
	this.isshow = false 
	this.callback = null 
	if(menu) this.setmenu(menu)
}
setmenu(menu) {
	const s = []
	if(menu.title) s.push(menu.title) 
	s.push("<ul>") 
	menu.item.forEach(m=>{
		s.push(`<li data-menu="${m.id}">${m.disp}</li>`)
	})
	s.push("</ul>")
	this.el.innerHTML = s.join("\n")
	const menuck = (ev)=> {
		const menu = ev.target.getAttribute("data-menu")
		if(this.callback) this.callback({select:menu,pos:this.pos})
		this.hide()
	}
	this.el.querySelectorAll("li").forEach(o=>{
		o.addEventListener("click", menuck)
	})
}
show(pos) {
	this.pos = pos 
	this.el.style.left = pos[0]+"px"
	this.el.style.top = pos[1]+"px"
	this.base.appendChild(this.el)
	this.isshow = true 
}
hide() {
	if(!this.isshow) return 
	this.base.removeChild(this.el)
	this.isshow = false 
}
}//CMenu