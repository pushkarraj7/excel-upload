function movingAverage(data, window) {
  const result = [];

  for (let i = window - 1; i < data.length; i++) {
    const slice = data.slice(i - window + 1, i + 1);
    const avg =
      slice.reduce((sum, d) => sum + Number(d.closePrice), 0) / window;

    result.push({
      index: i,
      avg,
      endDate: data[i].priceDate,
    });
  }

  return result;
}

exports.calculateSignals = (prices) => {
  const avg11 = movingAverage(prices, 11);
  const avg22 = movingAverage(prices, 22);
  const avg13 = movingAverage(prices, 13);
  const avg34 = movingAverage(prices, 34);
  const avg50 = movingAverage(prices, 50);

  const signals = [];

  avg11.forEach((a11) => {
    const a22 = avg22.find((a) => a.index === a11.index);
    if (!a22) return;

    signals.push({
      shortWindow: 11,
      longWindow: 22,
      shortAvg: a11.avg,
      longAvg: a22.avg,
      signal: a11.avg > a22.avg ? "BUY" : "SELL",
      endDate: a11.endDate,
    });
  });

  return signals;
};