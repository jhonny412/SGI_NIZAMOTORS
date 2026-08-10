// Native fetch is available
const API_URL = "https://script.google.com/macros/s/AKfycbxEL6F6W-TtiadTLzyUXFvGqZYuEopNE1Eq6wtnixTVXcEwbrUo1pw-AGV3n4ktrPU/exec";
const query = "ALTERNADOR HX140 KIA K2700 VACIO GRANDE spare part";

async function run() {
  const res = await fetch(`${API_URL}?action=searchImage&query=${encodeURIComponent(query)}`);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data, null, 2));
}
run();
