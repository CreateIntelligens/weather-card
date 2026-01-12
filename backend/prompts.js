export const getWeatherReasoningPrompt = (city, currentUtcTime, language = "Local (Auto)") => {
  const langInstruction = language === "Local (Auto)" 
    ? "the city's local native language" 
    : `"${language}"`;

  return `
You are a weather data assistant. 
The user wants a weather card for the city: "${city}".

Current System UTC Time: ${currentUtcTime}
Target Language: ${langInstruction}

Task:
1. Identify the city's location and timezone.
2. Calculate the CURRENT local date and time for that city based on the UTC time provided above.
3. Determine the likely current weather condition (e.g. based on season/latitude) or use "Sunny" as a default if unsure, but try to be realistic for the season.
4. Provide the following fields strictly in JSON format:
    - "native_city_name": The name of the city translated into ${langInstruction}.
    - "native_date_formatted": The current local date formatted in ${langInstruction}.
    - "weather_condition": The weather condition translated into ${langInstruction}.
    - "temp_range": A realistic temperature range for today in the local unit (e.g. "15°C - 20°C").

Output JSON only. No markdown.
`.trim();
};

export const getWeatherImagePrompt = (weatherData, aspectRatio = "9:16", language = "Local (Auto)") => {
  const langInstruction = language === "Local (Auto)"
    ? "該城市的當地母語語言"
    : `"${language}"`;

  return `
[畫面設定]
呈現一個清晰的、45° 俯視角度的豎向（${aspectRatio}）等距縮小 3D 卡通場景。
畫面中心以「${weatherData.native_city_name}」的代表性地標為主體，展現精準細緻的建模。

[風格與材質]
場景使用柔和、細膩的質感，採用逼真的 PBR 材質，並搭配自然柔和的光影效果。
整體視覺風格清新、舒心、簡約。背景為柔和的純色，以凸顯主要內容。

[天氣氛圍整合]
當前天氣為「${weatherData.weather_condition}」。請將天氣元素以創意方式融入城市建築，使城市景觀與大氣條件產生動態互動（例如：雨天時街道有積水倒影、晴天時有明亮光斑、多雲時有柔和漫射光、下雪時有積雪），打造沉浸式的天氣氛圍。

[文字與 UI 版面]
在畫面上方中央展示明顯的「${weatherData.weather_condition}」圖示（3D Icon）。
* **城市名稱**：位於圖示正上方，顯示「${weatherData.native_city_name}」（大字）。
* **日期**：位於圖示下方，顯示「${weatherData.native_date_formatted}」（小字）。
* **氣溫**：位於日期下方，顯示「${weatherData.temp_range}」（中字）。
* **重要：確保畫面上的所有文字都嚴格使用 ${langInstruction} 書寫。** 文字與圖示不需背景框，可與建築輕微重疊，保持畫面通透。
`.trim();
};