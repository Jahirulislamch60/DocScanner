# DocScanner

একটি ক্রস-প্ল্যাটফর্ম (Android + iOS) ডকুমেন্ট স্ক্যানার অ্যাপ, Expo + React Native + TypeScript দিয়ে বানানো।

## ফিচার

- **স্বয়ংক্রিয় এজ-ডিটেকশন স্ক্যান** (`app/scan.tsx` → `src/lib/documentScanner.ts`) — Android-এ Google ML Kit Document Scanner ও iOS-এ Apple VisionKit ব্যবহার করে কাগজের চারকোণা নিজে থেকে ডিটেক্ট করে perspective-correct (warp) করা crop — ঠিক CamScanner যেভাবে করে
- ম্যানুয়াল ক্যামেরা ফলব্যাক (`app/scan-manual.tsx`) — Expo Go-তে বা নেটিভ স্ক্যানার না থাকলে ব্যবহারের জন্য
- পেজ resize/compress + rotate (`src/lib/imageProcessing.ts`)
- মাল্টি-পেজ PDF এক্সপোর্ট ও শেয়ার (`src/lib/pdf.ts`, পুরোপুরি on-device, pdf-lib দিয়ে)
- অন-ডিভাইস OCR টেক্সট এক্সট্র্যাকশন (`src/lib/ocr.ts`, ML Kit / Apple Vision — নেটওয়ার্ক লাগে না)
- **ফোল্ডার অর্গানাইজেশন** — ডকুমেন্ট ফোল্ডারে ভাগ করে রাখা, হোম স্ক্রিনের চিপ দিয়ে ফিল্টার (`src/lib/storage.ts` folder ফাংশন, `app/index.tsx`)
- **অ্যাপ লক (PIN + বায়োমেট্রিক)** — পুরো অ্যাপ PIN বা ফিঙ্গারপ্রিন্ট/ফেস আইডি দিয়ে সুরক্ষিত করা যায়, `app/settings.tsx`-এ চালু/বন্ধ করা যায় (`src/lib/appLock.ts`)
- ডকুমেন্ট লিস্ট, রিনেম, ডিলিট, ফোল্ডারে সরানো (`app/index.tsx`, `app/preview/[id].tsx`)
- **অফলাইন-ফার্স্ট**: স্ক্যান, ক্রপ/এনহ্যান্স, PDF এক্সপোর্ট, OCR, ডকুমেন্ট লিস্ট, ফোল্ডার, অ্যাপ লক — এসব সবকিছুই সম্পূর্ণ অফলাইনে কাজ করে (লোকাল স্টোরেজ, on-device OCR, কোনো ব্যাকএন্ড সার্ভার নেই)
- **অনলাইন হলে ঐচ্ছিক Google Drive ব্যাকআপ**: ইউজার নিজে বাটনে চাপলেই শুধু PDF-টি Drive-এ আপলোড হয় (`src/lib/cloudBackup.ts`, `src/lib/googleDrive.ts`) — অফলাইনে থাকলে বাটন disable হয়ে যায়, বাকি সব ফিচার স্বাভাবিকভাবে চলতে থাকে

## ⚠️ এই প্রজেক্টটি কীভাবে বানানো হয়েছে

এই কোড একটি নেটওয়ার্ক-রেস্ট্রিকটেড sandbox-এ হাতে লেখা হয়েছে — `npm install` এখানে চালানো যায়নি (npm registry-তে অ্যাক্সেস ব্লকড), তাই **এই প্রজেক্ট এখনো আপনার মেশিনে টেস্ট করা হয়নি**। ফাইল স্ট্রাকচার ও কোড সঠিক Expo/React Native API অনুযায়ী লেখা, কিন্তু প্রথমবার রান করার সময় কোনো ছোটখাটো ভার্সন-মিসম্যাচ থাকলে আমাকে এরর মেসেজ দিন, আমি ঠিক করে দেব।

## শুরু করা (আপনার নিজের কম্পিউটারে)

প্রয়োজন: Node.js 20+, npm, এবং একটি ফোনে **Expo Go** অ্যাপ (শুধু প্রাথমিক UI টেস্টের জন্য) অথবা Android Studio / Xcode (native ফিচার সহ পুরো টেস্টের জন্য)।

```bash
cd DocScanner
npm install
npx expo start
```

`npx expo start` চালানোর পর QR কোড স্ক্যান করে Expo Go দিয়ে খুলতে পারবেন — **কিন্তু মনে রাখবেন**:

### ⚠️ Expo Go-তে যা কাজ করবে না

এই অ্যাপে যেসব native মডিউল আছে সেগুলো Expo Go-তে চলে না (নিজস্ব native কোড আছে যা Expo Go-র প্রি-বিল্ট বাইনারিতে নেই):

- `react-native-document-scanner-plugin` (স্বয়ংক্রিয় এজ-ডিটেকশন স্ক্যান)
- `@react-native-ml-kit/text-recognition` (OCR ফিচার)
- `expo-local-authentication` (বায়োমেট্রিক আনলক — PIN অংশটুকু অবশ্য কাজ করবে, কারণ PIN `expo-secure-store` দিয়ে হয়)

Expo Go-তে "স্ক্যান করুন" চাপলে অ্যাপ নিজে থেকেই বুঝে "ম্যানুয়াল ক্যামেরা ব্যবহার করুন" অপশন দেখাবে — সেটা দিয়ে ক্যাপচার, PDF এক্সপোর্ট, ফোল্ডার, ডকুমেন্ট লিস্ট সবই টেস্ট করা যাবে। শুধু auto-edge-detection আর OCR-এর জন্য dev client লাগবে।

### পুরো ফিচার টেস্ট করতে — Dev Client বানান

```bash
npx expo install expo-dev-client
npx eas login          # প্রথমবার হলে ফ্রি Expo অ্যাকাউন্ট বানাতে হবে
npx eas build:configure
npx eas build --profile development --platform android   # বা ios
```

বিল্ড শেষ হলে EAS একটি ডাউনলোড লিংক দেবে (APK বা .ipa) — সেটা ফোনে ইনস্টল করে `npx expo start --dev-client` দিয়ে কানেক্ট করুন। এবার OCR-সহ সব ফিচার কাজ করবে।

## Google Drive ব্যাকআপ সেটআপ (ঐচ্ছিক ফিচার)

অ্যাপটি Drive ছাড়াই সম্পূর্ণ কাজ করে — এই সেটআপ না করলে "Google Drive-এ ব্যাকআপ করুন" বাটনে চাপলে একটা নোটিফিকেশন দেখাবে যে এটা কনফিগার করা হয়নি, বাকি সব ফিচার স্বাভাবিক থাকবে।

চালু করতে নিজের একটা Google Cloud OAuth ক্লায়েন্ট আইডি লাগবে (এটা আমি বানিয়ে দিতে পারি না — এটা আপনার নিজের Google অ্যাকাউন্টের সাথে যুক্ত হতে হয়):

1. [Google Cloud Console](https://console.cloud.google.com/) → একটা নতুন প্রজেক্ট বানান (ফ্রি)।
2. **APIs & Services → Library** → "Google Drive API" খুঁজে **Enable** করুন।
3. **APIs & Services → OAuth consent screen** → External সিলেক্ট করে অ্যাপের নাম, আপনার ইমেইল (`tajahir7@gmail.com`) দিয়ে বেসিক তথ্য পূরণ করুন। Scope-এ `drive.file` যোগ করুন (পুরো Drive-এর অ্যাক্সেস নয় — শুধু এই অ্যাপ যে ফাইল বানায়, সেটুকুই)।
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** — এখানে তিনটা ক্লায়েন্ট আইডি লাগবে:
   - **Web application** টাইপ (Expo Go/dev client-এ টেস্টের জন্য দরকার)
   - **Android** টাইপ — Package name: `com.tajahir.docscanner`, আর SHA-1 fingerprint (`eas credentials` কমান্ড দিয়ে বের করা যায়)
   - **iOS** টাইপ — Bundle ID: `com.tajahir.docscanner`
5. তিনটা ক্লায়েন্ট আইডি `app.json`-এর `expo.extra.googleOAuth` অংশে বসান:
   ```json
   "googleOAuth": {
     "web": "xxxx.apps.googleusercontent.com",
     "ios": "xxxx.apps.googleusercontent.com",
     "android": "xxxx.apps.googleusercontent.com"
   }
   ```
6. যেহেতু এটা OAuth ব্যবহার করে, dev client/production বিল্ড লাগবে (Expo Go-তে ব্রাউজার রিডাইরেক্ট ঠিকমতো কাজ নাও করতে পারে) — উপরের "Dev Client বানান" অংশ অনুসরণ করুন।

## প্রোডাকশন বিল্ড (Play Store / App Store-এ দেওয়ার জন্য)

```bash
npx eas build --profile production --platform android   # .aab ফাইল বানাবে
npx eas build --profile production --platform ios       # .ipa ফাইল বানাবে
```

তারপর:

- **Android**: [Google Play Console](https://play.google.com/console) → নতুন অ্যাপ → Production track-এ `.aab` আপলোড করুন। এককালীন রেজিস্ট্রেশন ফি ($25) লাগবে।
- **iOS**: [App Store Connect](https://appstoreconnect.apple.com) → Apple Developer অ্যাকাউন্ট (বছরে $99) লাগবে। `npx eas submit --platform ios` দিয়ে সরাসরি সাবমিট করা যায়।

`app.json`-এ `android.package` ও `ios.bundleIdentifier` (`com.tajahir.docscanner`) — চাইলে নিজের ইউনিক আইডেন্টিফায়ারে বদলে নিন Play Store/App Store-এ পাবলিশ করার আগে।

## গুরুত্বপূর্ণ — যা CamScanner-জাতীয় অ্যাপে সমস্যা করে, এখানে যা এড়ানো হয়েছে

আগের কথোপকথনে CamScanner-স্টাইল অ্যাপের যেসব অভিযোগ দেখা গিয়েছিল, সেগুলো এই ডিজাইনে ইচ্ছাকৃতভাবে এড়ানো হয়েছে:

- **কোনো জোরপূর্বক সাবস্ক্রিপশন নেই** — সম্পূর্ণ ফ্রি, কোনো পেওয়াল বা ওয়াটারমার্ক নেই।
- **কোনো বিজ্ঞাপন নেই, কোনো তৃতীয় পক্ষের অ্যাড SDK নেই** — CamScanner-এ ২০১৯ ও ২০২৪ সালে তৃতীয় পক্ষের অ্যাড লাইব্রেরির মধ্যে ম্যালওয়্যার (ট্রোজান ডাউনলোডার) পাওয়া গিয়েছিল যা ব্যাকগ্রাউন্ডে ইউজারকে না জানিয়ে সাবস্ক্রিপশনে সাইন আপ করাতো। এই অ্যাপে যেহেতু কোনো অ্যাড SDK-ই নেই, এই ধরনের ঝুঁকি একদমই নেই।
- **ডেটা ফোন থেকে বাইরে যায় না** — কোনো ব্যাকএন্ড সার্ভার নেই, OCR-ও অন-ডিভাইস, তাই "থার্ড-পার্টি ডেটা শেয়ারিং" সমস্যা নেই।
- **সরাসরি ডাউনলোড/শেয়ার** — PDF তৈরি হয়ে সরাসরি ফোনের শেয়ার শীটে যায়, ইমেইল করে আবার ডাউনলোড করার ঝামেলা নেই।
- **টাকা-পয়সার কোনো ঝামেলা নেই, তাই "সাপোর্ট রেসপন্স দেয় না" অভিযোগের সুযোগও নেই** — তবে অ্যাপ পাবলিশ করলে `app.json`-এ একটা সত্যিকারের যোগাযোগের ইমেইল রাখা ভালো, যেটা আপনি নিয়মিত চেক করেন।

## এখন পর্যন্ত সম্পূর্ণ হওয়া ফিচারগুলো

- ✅ স্বয়ংক্রিয় edge-detection ও perspective correction (native ML Kit Document Scanner / VisionKit)
- ✅ ফোল্ডার অর্গানাইজেশন
- ✅ অ্যাপ লক (PIN + বায়োমেট্রিক)
- ✅ Google Drive ব্যাকআপ (ঐচ্ছিক, ম্যানুয়াল)
- ✅ অফলাইন + অনলাইন উভয় মোডে কাজ করে

## পরের ধাপে যোগ করা যেতে পারে (এই সংস্করণে নেই)

- পেজ রিঅর্ডার (drag to reorder) — এখন পৃষ্ঠাগুলো যে ক্রমে স্ক্যান হয় সেই ক্রমেই থাকে
- পাসওয়ার্ড-প্রোটেক্টেড PDF ফাইল (আলাদা — এটা PDF ফাইলে নিজে পাসওয়ার্ড বসানো, অ্যাপ-লক থেকে ভিন্ন)
- একাধিক ডিভাইসের মধ্যে অটো-সিঙ্ক (এখন শুধু ম্যানুয়াল Drive ব্যাকআপ আছে)

বলুন কোনটা আগে যোগ করব, অথবা রান করার সময় কোনো এরর পেলে সেটা পাঠান — ঠিক করে দিচ্ছি।
