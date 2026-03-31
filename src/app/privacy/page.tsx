"use client";

import styles from "@/styles/Global.module.css";

export default function PrivacyPage() {
    return (
        <div className={styles.section}>
            <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
            <p className="mb-6">
                <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">1. Information We Collect</h2>
                <p>
                    We collect and store business-related information you provide while using this application.
                    This may include your name, email address, and activity related to events and account
                    management. No personal information unrelated to business operations is intentionally
                    collected.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">2. How We Use Information</h2>
                <p>
                    Information is used strictly for internal business purposes, including processing orders,
                    managing accounts, and supporting authorized employees of Stateline Raceway LLC. We do not sell or share your data with third parties.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">3. Data Security</h2>
                <p>
                    We take reasonable measures to protect your information from unauthorized access,
                    disclosure, alteration, or destruction. However, no system is completely secure, and we
                    cannot guarantee absolute protection.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">4. Access and Control</h2>
                <p>
                    Users may request access to their stored information or ask for corrections to inaccuracies
                    by contacting the support team. Access will only be granted to authorized company
                    employees.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">5. Retention of Information</h2>
                <p>
                    We retain information for as long as necessary to support company operations and comply
                    with legal obligations. Data no longer required will be securely removed.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">6. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. Any changes will be effective upon
                    posting. Continued use of the app indicates acceptance of these changes.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-semibold">7. Contact</h2>
                <p>
                    For questions about this Privacy Policy, contact:{" "}
                    <a href="mailto:mmccoyinfo@gmail.com" className="text-blue-600 underline">
                        mmccoyinfo@gmail.com
                    </a>
                </p>
            </section>
        </div>
    );
}

