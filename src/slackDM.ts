/**
 * Slack DM dispatcher — sends notifications to individual users via their member IDs.
 * Requires the Slack Bot Token (xoxb-...) for DMs, falls back to webhook for channel.
 */

export interface SlackDMConfig {
  botToken?: string;         // xoxb-... for DMs
  webhookUrl?: string;       // fallback for channel
  memberId?: string;         // channel @mention
}

export async function sendSlackDM(memberId: string, botToken: string, message: string, blocks?: any[]): Promise<{ ok: boolean; error?: string }> {
  try {
    // Step 1: Open DM conversation
    const openRes = await fetch("https://slack.com/api/conversations.open", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ users: memberId }),
    });
    const openData = await openRes.json() as any;
    if (!openData.ok) return { ok: false, error: openData.error };

    const channelId = openData.channel?.id;

    // Step 2: Post message to DM channel
    const postRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", Authorization: `Bearer ${botToken}` },
      body: JSON.stringify({ channel: channelId, text: message, blocks }),
    });
    const postData = await postRes.json() as any;
    return { ok: postData.ok, error: postData.error };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

export async function sendSlackWebhook(webhookUrl: string, text: string, blocks?: any[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, blocks }),
    });
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}
