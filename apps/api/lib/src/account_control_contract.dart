class DeleteAccountRequest {
  const DeleteAccountRequest();

  factory DeleteAccountRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.length != 1 || json['confirmation'] != 'DELETE') {
      throw const FormatException('Account deletion confirmation is required.');
    }
    return const DeleteAccountRequest();
  }
}
