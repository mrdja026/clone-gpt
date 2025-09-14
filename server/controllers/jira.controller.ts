import { Controller, Get, HttpException, HttpStatus, Inject, Param } from "@nestjs/common";
import axios from "axios";
import { ConfigService } from "@nestjs/config";

@Controller("jira")
export class JiraController {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private getJiraConfig() {
    const baseUrl = this.config.get<string>("JIRA_BASE_URL") || process.env.JIRA_BASE_URL || "";
    const email = this.config.get<string>("JIRA_EMAIL") || process.env.JIRA_EMAIL || "";
    const apiToken = this.config.get<string>("JIRA_API_TOKEN") || process.env.JIRA_API_TOKEN || "";
    return { baseUrl, email, apiToken };
  }

  private normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, "");
  }

  @Get("myself")
  async getMyself() {
    const { baseUrl, email, apiToken } = this.getJiraConfig();
    if (!baseUrl || !email || !apiToken) {
      throw new HttpException(
        {
          error: "Missing Jira configuration",
          required: ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
    const url = `${this.normalizeBaseUrl(baseUrl)}/rest/api/3/myself`;
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      });
      return res.data;
    } catch (e: any) {
      const status = e?.response?.status || 502;
      const data = e?.response?.data || { message: e?.message || "Unknown error" };
      throw new HttpException({ error: "Jira request failed", data }, status);
    }
  }

  @Get("issue/:key")
  async getIssueByKey(@Param('key') key: string) {
    const { baseUrl, email, apiToken } = this.getJiraConfig();
    if (!baseUrl || !email || !apiToken) {
      throw new HttpException(
        {
          error: "Missing Jira configuration",
          required: ["JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN"],
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");
    const url = `${this.normalizeBaseUrl(baseUrl)}/rest/api/3/issue/${encodeURIComponent(
      key,
    )}`;
    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      });
      return res.data;
    } catch (e: any) {
      const status = e?.response?.status || 502;
      const data = e?.response?.data || { message: e?.message || "Unknown error" };
      throw new HttpException({ error: "Jira request failed", data }, status);
    }
  }
}
