// Light / dark for the CMS and the proofreading desk (one choice for both).
// Light is the default. The script runs before the page paints, so there's no flash.

export const CMS_THEME_KEY = "bt_cms_theme";

export const CMS_THEME_SCRIPT = `try{if(localStorage.getItem("${CMS_THEME_KEY}")==="dark")document.documentElement.classList.add("dark")}catch(e){}`;
