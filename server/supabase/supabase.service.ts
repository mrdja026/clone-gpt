import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase: SupabaseClient<Database>;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseServiceKey = this.configService.get<string>(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase URL and Service Role Key must be provided");
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log("Supabase client initialized");
  }

  get client(): SupabaseClient<Database> {
    return this.supabase;
  }

  // Helper method to create authenticated client for user operations
  createAuthenticatedClient(accessToken: string): SupabaseClient<Database> {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseAnonKey = this.configService.get<string>("SUPABASE_ANON_KEY");

    return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }
}
