import React from "react"; import { createRoot } from "react-dom/client";
import WeekTimetable from "./src/components/WeekTimetable";
const R=(id,title,emoji,who,type="main",ing=[1])=>({id,title,emoji,type,servings:who.map(f=>({for_who:f})),ingredients:ing});
const days=[
 {id:1,day:"Monday",date:"26 October",recipes:[R("a","Gyudon","🍚",["kids"]),R("b","Salade Chèvre Chaud","🥗",["adult"])]},
 {id:2,day:"Tuesday",date:"27 October",recipes:[R("c","Phở Gà","🍜",["kids","adult"])]},
 {id:3,day:"Wednesday",date:"28 October",holiday:true,holiday_name:"Deepavali",recipes:[R("v","Holiday","🎉",["all"],"main",[])]},
 {id:4,day:"Thursday",date:"29 October",recipes:[R("d","Mild Pork Ramen","🍜",["kids","adult"]),R("e","Lentil & Beetroot Salad","🥗",["adult"]),R("f","Tarte aux Fraises","🍓",["all"],"dessert")]},
 {id:5,day:"Friday",date:"30 October",recipes:[R("g","Cotoletta di Pollo","🍗",["kids","adult"])]},
];
createRoot(document.getElementById("root")).render(<div style={{maxWidth:500,margin:"0 auto",padding:"20px 16px"}}><div style={{background:"#2A2A2A",borderRadius:16,padding:"22px 20px"}}><p style={{margin:"0 0 4px",fontSize:11,fontFamily:"sans-serif",color:"rgba(255,255,255,0.45)",letterSpacing:1.5,textTransform:"uppercase"}}>Week of</p><p style={{margin:"0 0 16px",fontSize:22,color:"white"}}>26 – 30 October</p><WeekTimetable dark days={days}/></div></div>);
