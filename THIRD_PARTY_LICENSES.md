# থার্ড-পার্টি লাইসেন্স

কপিরাইট/লাইসেন্স ঝুঁকি এড়ানোর জন্য এই তালিকা রাখা হলো — এই অ্যাপে ব্যবহৃত সব বাইরের লাইব্রেরি **permissive ওপেন-সোর্স লাইসেন্সের** (মূলত MIT), যেগুলো বাণিজ্যিকভাবে ব্যবহার, পরিবর্তন ও ক্লোজড-সোর্স অ্যাপে বান্ডল করার অনুমতি দেয়, কোনো "copyleft" শর্ত (যেমন GPL) ছাড়াই — অর্থাৎ এগুলোর জন্য অ্যাপের নিজের সোর্স কোড পাবলিশ করার কোনো বাধ্যবাধকতা নেই।

| লাইব্রেরি | লাইসেন্স | ব্যবহার |
|---|---|---|
| Expo SDK ও সব `expo-*` প্যাকেজ | MIT | ক্যামেরা, ফাইল সিস্টেম, রাউটিং, ইত্যাদি |
| React, React Native | MIT | কোর ফ্রেমওয়ার্ক |
| `react-native-document-scanner-plugin` | MIT | নেটিভ এজ-ডিটেকশন স্ক্যান (Google ML Kit / Apple VisionKit-এর wrapper) |
| `@react-native-ml-kit/text-recognition` | MIT | OCR (Google ML Kit-এর wrapper) |
| `pdf-lib` | MIT | on-device PDF তৈরি |
| `react-native-purchases` (RevenueCat) | MIT | সাবস্ক্রিপশন |
| `@react-native-async-storage/async-storage` | MIT | লোকাল স্টোরেজ |
| `@expo/vector-icons` (Ionicons) | MIT | আইকন |
| `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context` | MIT | UI/নেভিগেশন |

**নোট:**
- Google ML Kit ও Apple VisionKit নিজেরাই Google/Apple-এর অফিসিয়াল অন-ডিভাইস SDK — এগুলো তাদের নিজস্ব শর্তে ব্যবহারযোগ্য, ডেভেলপারদের জন্য উন্মুক্ত, এবং এই কোড শুধু তাদের প্রকাশিত API কল করে, কোনো তাদের কপিরাইটেড কোড কপি করে না।
- অ্যাপ আইকন ও স্প্ল্যাশ স্ক্রিন (`assets/`) এই প্রজেক্টের জন্য থেকে বানানো, কোনো বিদ্যমান অ্যাপ/লোগো থেকে কপি করা নয়।
- `npm install` চালানোর পর `npx license-checker` (আলাদা করে ইনস্টল করতে হবে) দিয়ে পুরো dependency ট্রি-র লাইসেন্স আবার যাচাই করে নেওয়া ভালো অভ্যাস, কারণ প্রতিটি প্যাকেজ নিজের সাব-ডিপেন্ডেন্সি টেনে আনে।
