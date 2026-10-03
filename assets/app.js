const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

const views=["dashboard","content","connections","settings"];

$$("nav button").forEach(b=>b.onclick=()=>{
  views.forEach(v=>$("#"+v).classList.remove("active"));
  $("#"+b.dataset.view).classList.add("active");
  $("#pageTitle").textContent=b.textContent;
});

function toast(x){
  $("#toast").textContent=x;
  $("#toast").style.display="block";
  setTimeout(()=>$("#toast").style.display="none",2200);
}

$("#newBtn").onclick=()=>$("#video").click();

$("#video").onchange=e=>{
  let f=e.target.files[0];
  if(!f)return;

  $("#preview").src=URL.createObjectURL(f);
  $("#preview").hidden=false;
  $("#file").textContent=f.name;

  toast("Video selected.");
};

$$(".plat").forEach(x=>x.onchange=update);

function update(){
  let n=$$(".plat:checked").map(x=>x.value);

  $("#summary").textContent=n.length
    ? n.length+" platform(s) selected: "+n.join(", ")
    : "Select a platform.";
}

update();

$("#ai").onclick=async()=>{
  let topic=$("#title").value||$("#file").textContent||"new video";

  $("#aiStatus").textContent="Generating AI…";
  $("#ai").disabled=true;

  try{
    let r=await fetch("/.netlify/functions/generate",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({topic})
    });

    let d=await r.json();

    if(!r.ok)throw Error(d.error||"AI failed");

    $("#title").value=d.title||"";
    $("#caption").value=d.caption||"";
    $("#tags").value=Array.isArray(d.hashtags)
      ? d.hashtags.join(" ")
      : d.hashtags||"";

    sync();

    $("#aiStatus").textContent="AI content generated successfully.";

  }catch(e){
    $("#aiStatus").textContent=e.message;
  }finally{
    $("#ai").disabled=false;
  }
};

function sync(){
  $("#pTitle").textContent=$("#title").value||"No title yet";
  $("#pCaption").textContent=$("#caption").value||"No caption yet";
  $("#pTags").textContent=$("#tags").value||"No hashtags yet";
}

["title","caption","tags"].forEach(id=>{
  $("#"+id).oninput=sync;
});

$("#publish").onclick=async()=>{

  if(!$("#video").files[0])
    return toast("Pehle video upload karo.");

  let platforms=$$(".plat:checked").map(x=>x.value);

  if(!platforms.length)
    return toast("Platform select karo.");

  $("#publish").disabled=true;

  try{
    let r=await fetch("/.netlify/functions/publish",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        platforms,
        title:$("#title").value,
        caption:$("#caption").value,
        hashtags:$("#tags").value
      })
    });

    let d=await r.json();

    toast(d.message||"Ready");

  }catch(e){
    toast("Publish preparation failed.");
  }finally{
    $("#publish").disabled=false;
  }
};

$("#save").onclick=()=>{
  localStorage.setItem(
    "onepost_settings",
    JSON.stringify({
      brand:$("#brand").value,
      lang:$("#lang").value,
      privacy:$("#privacy").value
    })
  );

  $("#saved").textContent="Settings saved.";
  toast("Settings saved.");
};

let s=JSON.parse(
  localStorage.getItem("onepost_settings")||"{}"
);

$("#brand").value=s.brand||"";
$("#lang").value=s.lang||"English";
$("#privacy").value=s.privacy||"Private";

sync();

/* =========================
   YOUTUBE CONNECTION
   ========================= */

const connectionsPage=$("#connections");

if(connectionsPage){

  const youtubeText=connectionsPage.querySelector("p");

  if(youtubeText){

    const youtubeButton=document.createElement("button");

    youtubeButton.id="youtubeConnect";
    youtubeButton.className="primary";
    youtubeButton.textContent="Connect YouTube";

    youtubeButton.style.marginTop="12px";

    youtubeText.insertAdjacentElement(
      "afterend",
      youtubeButton
    );

    youtubeButton.onclick=()=>{
      window.location.href="/.netlify/functions/youtube-auth";
    };

    const params=new URLSearchParams(window.location.search);

    if(params.get("youtube")==="connected"){

      youtubeButton.textContent="✓ YouTube Connected";
      youtubeButton.disabled=true;

      youtubeButton.style.opacity="0.8";

      toast("YouTube successfully connected.");

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }
  }
}
