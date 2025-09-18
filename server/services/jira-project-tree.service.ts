import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { fetchProjectTree3Levels } from "../utils/jira-project-tree";
import type {
  JiraProjectTreeResponse,
  JiraProjectTreeRequest,
} from "@shared/api";

@Injectable()
export class JiraProjectTreeService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private getJiraConfig() {
    const baseUrl =
      this.config.get<string>("JIRA_BASE_URL") ||
      process.env.JIRA_BASE_URL ||
      "";
    const email =
      this.config.get<string>("JIRA_EMAIL") || process.env.JIRA_EMAIL || "";
    const apiToken =
      this.config.get<string>("JIRA_API_TOKEN") ||
      process.env.JIRA_API_TOKEN ||
      "";
    return { baseUrl, email, apiToken };
  }

  private normalizeBaseUrl(url: string) {
    return url.replace(/\/$/, "");
  }

  async getProjectTree(
    request: JiraProjectTreeRequest,
  ): Promise<JiraProjectTreeResponse> {
    const { baseUrl, email, apiToken } = this.getJiraConfig();

    if (!baseUrl || !email || !apiToken) {
      throw new Error(
        "Missing Jira configuration. Required: JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN",
      );
    }

    const normalizedBaseUrl = this.normalizeBaseUrl(baseUrl);

    try {
      const result = await fetchProjectTree3Levels({
        baseUrl: normalizedBaseUrl,
        auth: { email, apiToken },
        projectKeyOrId: request.projectKeyOrId,
        pageSize: request.pageSize || 100,
      });

      return result;
    } catch (error: any) {
      throw new Error(`Failed to fetch project tree: ${error.message}`);
    }
  }

  async getProjectTreeForMcp(
    projectKeyOrId: string | number,
    pageSize?: number,
  ): Promise<JiraProjectTreeResponse> {
    return this.getProjectTree({ projectKeyOrId, pageSize });
  }
}
