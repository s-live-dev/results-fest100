// https://script.google.com/macros/s/AKfycbzH6WE7XKa42cev1U8vVe-rOuhjTluLKSTKN2fdSzwdxv8hMXiRlU9-PzGcNuwyJIpc/exec
// function test_getResultData() {
//   var ret = getResultData('1usOr0-LPevRcx8R6-7nbNFpLKbMUXpDwBV9_DK1JwOk','トラップ');
//   Logger.log(ret[0].種目);
// }
// function test_getEventInfoData() {
//   var ret = getEventInfoData('1usOr0-LPevRcx8R6-7nbNFpLKbMUXpDwBV9_DK1JwOk')
//   Logger.log(ret[0].QR);
// }
// function test_getCombinedData() {
//   getCombinedData('1usOr0-LPevRcx8R6-7nbNFpLKbMUXpDwBV9_DK1JwOk', '');
// }

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('vpsc_100tg');
  // 各県毎のリザルト用スプレッドシート,S-LIVE Results のチャンネル設定でsを固定
  template.s = (e && e.parameter && e.parameter.s) || '';
  template.sn = (e && e.parameter && e.parameter.sn) || '' //'トラップ'; // 'スキート'
  // テストモードパラメーター追加（文字列 "true" の場合のみテストモード有効）
  template.showTest = (e && e.parameter && e.parameter.showTest === 'true') || false;

  // include() 関数にsid、sn、showTestを直接渡す
  template.getHeader = function () {
    return include('vpsc_title-header', template.s, template.sn, template.showTest);
  };
  template.getFooter = function () {
    return include('vpsc_footer', template.s, template.sn, template.showTest);
  };
  template.getTables = function () {
    return include('vpsc_tables', template.s, template.sn, template.showTest);
  };

  return template.evaluate()
    .setTitle('S-LIVE | Results')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 分割されたHTMLをメインのHTMLでインクルードする関数
function include(filename, s, sn, showTest) {
  var template = HtmlService.createTemplateFromFile(filename);
  template.s = s;
  template.sn = sn;
  template.showTest = showTest;
  return template.evaluate().getContent();
}

// 撃数100で、(トラップが)60名以下の場合のスタイルオーバーライド
// function getvpStyleLarge() {
//   return HtmlService.createHtmlOutputFromFile('vpstyles_100tg').getContent();
// }

function getvpStyleLarge(players,targets) {
  if (players <= 18) {
    return HtmlService.createHtmlOutputFromFile('vpstyles_100tgL18').getContent();
  } else if (players <= 30) {
    return HtmlService.createHtmlOutputFromFile('vpstyles_100tgL30').getContent();
  } else if (players > 30 && targets != 200) {
    return HtmlService.createHtmlOutputFromFile('vpstyles_100tgL30').getContent();
  } else if (players > 30 && targets == 200) {
    return HtmlService.createHtmlOutputFromFile('vpstyles_100tgL60').getContent();
  }
}

// データオブジェクトをクライアントサイドへまとめて渡す関数
function getCombinedData(s, sn, showTest) {
  var eventInfoData = getEventInfoData(s, showTest); // showTestパラメーターを追加
  var resultData = getResultData(s, sn); // 既存のサーバーサイド関数を呼び出し
  // Logger.log(eventInfoData);
  // Logger.log(resultData);
  return {
    eventInfo: eventInfoData,
    result: resultData,
  };
}

// html より呼び出し
function getResultData(s, sn) {
  var sheet1, data1, sheet2, data2, dataC;

  if (sn == 'トラップ' || sn == 'スキート') {
    sheet1 = SpreadsheetApp.openById(s).getSheetByName(sn);
    data1 = sheet1.getDataRange().getValues();
    dataC = data1; // snがトラップまたはスキートの場合は、data1のみを返す
  } else {
    sheet1 = SpreadsheetApp.openById(s).getSheetByName('トラップ');
    data1 = sheet1.getDataRange().getValues();
    sheet2 = SpreadsheetApp.openById(s).getSheetByName('スキート');
    data2 = sheet2.getDataRange().getValues().slice(1); // 2行目から終わりまでを取得
    dataC = data1.concat(data2); // data1とdata2を結合
  }

  // 日時データを含む可能性のあるデータを変換する
  var convertedData1 = data1.map(function (row) {
    return row.map(function (cell) {
      return (cell instanceof Date) ? cell.toISOString() : cell;
    });
  });

  // snがトラップまたはスキートでない場合のみ、data2を変換する
  var convertedData2 = [];
  if (sn != 'トラップ' && sn != 'スキート') {
    convertedData2 = data2.map(function (row) {
      return row.map(function (cell) {
        return (cell instanceof Date) ? cell.toISOString() : cell;
      });
    });
  }

  // 変換したデータを結合またはそのまま返す
  var dataC = sn == 'トラップ' || sn == 'スキート' ? convertedData1 : convertedData1.concat(convertedData2);

  // dataC の空白設定
  for (var i = 0; i < dataC.length; i++) {
    // [同順]に900,901または999が含まれている場合
    if (dataC[i][2] >= 900) {
      dataC[i][2] = " "; // 同順:[2] を無資格記号に
    }
  }
  // 選手未登録の場合の参照エラー対応
  // if (dataC[1][0] == '#N/A') { dataC[1][0] = 'Awaiting Check-in'; }
  // if (dataC[127][0] == '#N/A') { dataC[127][0] = 'Awaiting Check-in'; }
  if (dataC.length > 1 && dataC[1][0] == '#N/A') {
    dataC[1][0] = 'Awaiting Registration';
  }
  if (dataC.length > 127 && dataC[127][0] == '#N/A') {
    dataC[127][0] = 'Awaiting Registration';
  }
  // Logger.log(dataC); // 確認用
  return dataC;
}

function getEventInfoData(s, showTest) {
  // showTestのデフォルト値設定（文字列 "true" の場合のみテストモード有効）
  showTest = (showTest === 'true' || showTest === true) || false;

  var sheet = SpreadsheetApp.openById(s).getSheetByName('大会情報');
  var eData = sheet.getDataRange().getValues().slice(1, 3); // 最大2件のデータを取得

  // eData から列　主催協会:[0] が空の行を削除
  eData = eData.filter(function (row) {
    return row[0] !== ''; // インデックス0の列が空ではない行だけを残す
  });

  // テストモード確認: showTestがfalseの場合、大会名に"テスト"が含まれる行を除外
  if (!showTest) {
    eData = eData.filter(function (row) {
      var eventName = row[1] || ''; // 大会名は[1]列目
      return eventName.indexOf('テスト') === -1; // "テスト"が含まれていない行のみ残す
    });
  }

  return eData.map(function (row) {
    // OpenWeatherMap APIから気象情報を取得
    var location = row[7].split(',');
    var latitude = parseFloat(location[0].trim());
    var longitude = parseFloat(location[1].trim());
    var apiKey = PropertiesService.getScriptProperties().getProperty('AK_openWeather');
    var url = `https://api.openweathermap.org/data/2.5/weather?units=metric&lat=${latitude}&lon=${longitude}&appid=${apiKey}`;
    try {
      var response = UrlFetchApp.fetch(url);
      var json = response.getContentText();
      var weatherData = JSON.parse(json);
    } catch (error) {
      weatherData = {
        weather: [{ description: 'N/A ' }],
        main: { temp: 'N/A ', humidity: 'N/A ', pressure: 'N/A ' },
        wind: { speed: 'N/A ' }
      };
      console.log('S-LIVE: caught an error,set default values:', error);
    }
    // 戻り値となるオブジェクトを作成
    return {
      '主催': row[0],
      '大会名': row[1],
      '最終更新': '<i class="fa-regular fa-clock"></i> ' + Utilities.formatDate(new Date(row[2]), 'Asia/Tokyo', "yy/MM/dd HH:mm"),
      '日数': row[4] + 'Day(s)',
      '開催日': '<i class="fa-regular fa-calendar-days"></i> ' + Utilities.formatDate(new Date(row[5]), "Asia/Tokyo", "yy/MM/dd"),
      '場所': row[6],
      '座標': row[7],
      '種目': row[8],
      //'QR': "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent(row[9]) + '&format=png&margin=10&size=150x150',
      'QR': "https://api.qrserver.com/v1/create-qr-code/?data=" + encodeURIComponent('https://s-live.org/ridx') + '&format=png&margin=10&size=150x150',
      '経過日数': row[10],
      '旗': 'https://s-live.org/wp-content/plugins/s-live/resource/flag/' + encodeURIComponent(row[0]) + '.png',
      '撃数': row[11].match(/\d+/)[0],
      '件数': row[12], // 条件によるスタイルの切り替え
      '気象':
        '<i class="fa-solid fa-sun"></i> ' + weatherData.weather[0].description + ' ' +
        '<i class="fa-solid fa-temperature-three-quarters"></i> ' + weatherData.main.temp + 'c ' +
        '<i class="fa-solid fa-droplet"></i> ' + weatherData.main.humidity + '% ' +
        '<i class="fa-solid fa-wind"></i> ' + weatherData.wind.speed + 'm/s ' +
        '<i class="fa-solid fa-gauge-simple"></i> ' + weatherData.main.pressure + 'hPa',
      '状況': row[3],
      '状況アイコン': (function (status) {
        switch (status) {
          case '競技前': return '<i class="fa-regular fa-circle-pause"></i>';
          case '競技中': return '<i class="fa-regular fa-circle-play"></i>';
          case '競技終了': return '<i class="fa-regular fa-circle-check"></i>';
          case '1日目終了': return '<i class="fa-regular fa-circle-pause"></i>';
          default: return '';
        }
      })(row[3])
    };
  });
}