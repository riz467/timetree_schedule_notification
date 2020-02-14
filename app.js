require("dotenv").config();
const { WebClient } = require("@slack/web-api");
const request = require("request-promise");
const cron = require("node-cron");

const SLACK_TOKEN = process.env.SLACK_TOKEN;
const TIMETREE_PERSONAL_TOKEN = process.env.TIMETREE_PERSONAL_TOKEN;
const calendarid = process.env.CALENDAR_ID;
const sendchannelid = process.env.SEND_CHANNEL;

const web = new WebClient(SLACK_TOKEN);

function AccessApi(url) {
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.timetree.v1+json",
      Authorization: `Bearer ${TIMETREE_PERSONAL_TOKEN}`
    }
  };
  return new Promise((resorve, reject) => {
    request(url, options)
      .then(res => {
        resorve(res);
      })
      .catch(err => {
        reject(err);
      });
  });
}

async function schedule() {
  const members = await AccessApi(
    `https://timetreeapis.com/calendars/${calendarid}/members`
  ).then(resText => {
    return JSON.parse(resText);
  });
  AccessApi(
    `https://timetreeapis.com/calendars/${calendarid}/upcoming_events?timezone=Asia/Tokyo&days=1&include=creator`
  ).then(resText => {
    const jsonObject = JSON.parse(resText);
    let response = "";

    if (jsonObject.data.length === 0) {
      response = "本日の予定はありません";
    }

    for (let i = 0; i < jsonObject.data.length; i++) {
      let eventdate = new Date(jsonObject.data[i].attributes.start_at);
      let createuser = members.data.find(
        item => item.id === jsonObject.data[i].relationships.creator.data.id
      );

      response += `*予定名*:${jsonObject.data[i].attributes.title}\n`;
      response += `*作成者*:${createuser.attributes.name}\n`;
      if (jsonObject.data[i].attributes.all_day === false) {
        response += `*時間*:${eventdate.getHours()}時${eventdate.getMinutes()}分`;
      } else {
        response += `*時間*:終日`;
      }
      response += "\n\n";
    }
    web.chat.postMessage({
      text: `${response}`,
      channel: `${sendchannelid}`
    });
  });
}

cron.schedule("0 0 9 * *", () => schedule());
