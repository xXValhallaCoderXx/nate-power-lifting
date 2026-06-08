CREATE TABLE "accessory_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"name" text NOT NULL,
	"scheme" text NOT NULL,
	"done" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "athlete" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"bodyweight_kg" real,
	"units" text DEFAULT 'kg' NOT NULL,
	"plate_increment_kg" real DEFAULT 2.5 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lift" (
	"id" text PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"name" text NOT NULL,
	"training_max_kg" real,
	"tm_updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "logged_set" (
	"id" serial PRIMARY KEY NOT NULL,
	"prescribed_set_id" integer,
	"session_id" integer NOT NULL,
	"lift_id" text NOT NULL,
	"actual_weight_kg" real NOT NULL,
	"actual_reps" integer NOT NULL,
	"actual_rpe" real,
	"notes" text,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prescribed_set" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"lift_id" text NOT NULL,
	"role" text NOT NULL,
	"order_index" integer NOT NULL,
	"label" text,
	"target_weight_kg" real NOT NULL,
	"target_reps" integer NOT NULL,
	"is_amrap" boolean DEFAULT false NOT NULL,
	"is_backoff" boolean DEFAULT false NOT NULL,
	"is_warmup" boolean DEFAULT false NOT NULL,
	"target_rpe" real
);
--> statement-breakpoint
CREATE TABLE "program_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"phase" text DEFAULT 'reintro_linear' NOT NULL,
	"week_index" integer DEFAULT 1 NOT NULL,
	"day_number" integer DEFAULT 1 NOT NULL,
	"cycle_index" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer NOT NULL,
	"day_number" integer NOT NULL,
	"phase" text NOT NULL,
	"week_index" integer NOT NULL,
	"cycle_index" integer NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"date_planned" timestamp with time zone DEFAULT now() NOT NULL,
	"date_completed" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_max_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"lift_id" text NOT NULL,
	"old_tm" real,
	"new_tm" real NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accessory_item" ADD CONSTRAINT "accessory_item_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lift" ADD CONSTRAINT "lift_athlete_id_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athlete"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_set" ADD CONSTRAINT "logged_set_prescribed_set_id_prescribed_set_id_fk" FOREIGN KEY ("prescribed_set_id") REFERENCES "public"."prescribed_set"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logged_set" ADD CONSTRAINT "logged_set_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescribed_set" ADD CONSTRAINT "prescribed_set_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_config" ADD CONSTRAINT "program_config_athlete_id_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athlete"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_athlete_id_athlete_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athlete"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_max_event" ADD CONSTRAINT "training_max_event_lift_id_lift_id_fk" FOREIGN KEY ("lift_id") REFERENCES "public"."lift"("id") ON DELETE no action ON UPDATE no action;