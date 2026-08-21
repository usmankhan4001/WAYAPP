# 🤖 Bot Automations & 1-Click Industry Recipes

WAYAPP provides two powerful automation engines: **1-Click Pre-Built Industry Bot Recipes** for non-technical managers, and a full **Visual Node-Graph Flow Builder** for complex multi-step stateful journeys.

---

## 🛠️ 1. Pre-Built 1-Click Industry Bot Recipes

Located in `/automations`, non-technical business managers can activate proven sales and support bot templates with a single click:

### 🏢 Real Estate Property Viewing Scheduler
* **Trigger**: Inbound message contains `property, villa, apartment, rent, buy, viewing`.
* **Actions**: Sends luxury listings overview and brochure PDF $\rightarrow$ asks customer for preferred site viewing day $\rightarrow$ tags as `Real Estate Lead` $\rightarrow$ assigns to Property Sales Rep.

### 🛍️ E-Commerce Abandoned Cart & COD Recovery
* **Trigger**: Inbound message contains `order, cart, cod, checkout, delivery`.
* **Actions**: Offers 10% discount code with 1-click checkout recovery link $\rightarrow$ tags as `E-Commerce Customer`.

### 🚗 Automotive Showroom Test Drive Booking
* **Trigger**: Inbound message contains `test drive, car, showroom, suv, sedan`.
* **Actions**: Inquires preferred vehicle model (SUV vs Sedan) $\rightarrow$ schedules showroom test drive $\rightarrow$ tags as `Auto Test Drive Lead`.

### 🏥 Clinic & Healthcare Consultation Scheduler
* **Trigger**: Inbound message contains `doctor, clinic, appointment, dentist`.
* **Actions**: Shares clinic timings and specialist schedule $\rightarrow$ captures patient requested time $\rightarrow$ tags as `Patient Appointment Lead`.

### 💼 B2B Lead Gen & Demo Booking
* **Trigger**: Inbound message contains `price, quote, demo, proposal, enterprise`.
* **Actions**: Shares enterprise pricing overview $\rightarrow$ dispatches Calendly demo link $\rightarrow$ tags as `B2B Qualified Lead`.

---

## 🧩 2. Visual No-Code Flow Builder (`/flows`)

Built on `@xyflow/react`, the visual canvas allows teams to build complex, branching customer journeys:

### Available Node Types:
1. **💬 Send Message**: Text, image, video, document, or audio.
2. **🔘 Interactive Buttons / List**: Up to 3 quick-reply buttons or 10-item categorized lists.
3. **❓ Ask Question / Capture Input**: Validates and stores phone numbers, emails, numbers, and text into contact attributes.
4. **🔀 Branch Condition**: If/Else logic based on contact tags, deal stages, message content, or business hours.
5. **⏳ Delay / Timer**: Pauses execution (e.g. wait 2 hours, wait 1 day).
6. **🏷️ Add / Remove Tag**: Modifies contact tags.
7. **👤 Assign Agent / Team**: Routes chat to a specific sales agent or department.
8. **🧠 AI Knowledge Base Query**: Sends customer query to the LLM agent using your uploaded PDFs, FAQs, and product sheets as context.
