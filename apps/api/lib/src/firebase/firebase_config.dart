import 'package:picket_api/src/firebase/firebase_phone_token.dart';

/// Process-wide certificate cache shared by every request.
final googleSecureTokenKeys = GoogleSecureTokenKeys();

/// Verifier for the configured Firebase project (`FIREBASE_PROJECT_ID`).
FirebasePhoneTokenVerifier firebasePhoneVerifier(Map<String, String> env) =>
    FirebasePhoneTokenVerifier(
      projectId: env['FIREBASE_PROJECT_ID'] ?? '',
      keys: googleSecureTokenKeys.resolve,
    );
