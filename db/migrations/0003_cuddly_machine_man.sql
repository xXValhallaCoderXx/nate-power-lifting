CREATE TABLE "accessory_set" (
	"id" serial PRIMARY KEY NOT NULL,
	"accessory_item_id" integer NOT NULL,
	"session_id" integer NOT NULL,
	"order_index" integer NOT NULL,
	"weight_kg" real,
	"reps" integer
);
--> statement-breakpoint
ALTER TABLE "accessory_set" ADD CONSTRAINT "accessory_set_accessory_item_id_accessory_item_id_fk" FOREIGN KEY ("accessory_item_id") REFERENCES "public"."accessory_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_set" ADD CONSTRAINT "accessory_set_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accessory_item" DROP COLUMN "weight_kg";--> statement-breakpoint
ALTER TABLE "accessory_item" DROP COLUMN "reps";