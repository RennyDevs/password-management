/**
 * Type declarations for the Credential Management API.
 *
 * The `PasswordCredential` interface is part of the
 * [Credential Management API](https://www.w3.org/TR/credential-management/),
 * supported in Chromium-based browsers.
 */

interface PasswordCredentialInit {
  id: string;
  password: string;
  name?: string;
  iconURL?: string;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/API/PasswordCredential */
interface PasswordCredential extends Credential {
  readonly password: string;
  readonly iconURL: string;
  readonly name: string;
}

declare var PasswordCredential: {
  prototype: PasswordCredential;
  new (init: PasswordCredentialInit): PasswordCredential;
};

/** Extend CredentialRequestOptions to include password mediation. */
interface CredentialRequestOptions {
  password?: boolean;
}
