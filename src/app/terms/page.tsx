"use client";

import styles from "@/styles/Global.module.css";

export default function TermsPage() {
    return (
        <div className={styles.section}>
            <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
            <p className="mb-6">
                <strong>Effective Date:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">1. Internal Use Only</h2>
                <p>
                    This application is intended solely for authorized employees of Stateline Raceway LLC.
                    At any time this may change to incorporate public-facing pages; upon such change this
                    page will undergo updates to describe new use. Unauthorized access is strictly prohibited.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">2. Account Responsibility</h2>
                <p>
                    You are responsible for maintaining the security of your login credentials. Do not share
                    your account with others.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">3. Use of Data</h2>
                <p>
                    This app stores and processes business-related data. No personal data is sold or shared
                    with third parties. Data is used only to support company operations.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">4. Acceptable Use</h2>
                <p>
                    Users must comply with company policies. Any misuse of the system, including attempts to
                    gain unauthorized access or disrupt services, may result in account suspension.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">5. Disclaimer</h2>
                <p>
                    The application is provided “as is.” We make no warranties of any kind regarding its
                    availability, accuracy, or reliability.
                </p>
            </section>

            <section className="mb-4">
                <h2 className="text-xl font-semibold">6. Changes to Terms</h2>
                <p>
                    These Terms may be updated periodically. Continued use of the app after changes are made
                    indicates your acceptance of the updated Terms.
                </p>
            </section>

            <section>
                <h2 className="text-xl font-semibold">7. Contact</h2>
                <p>
                    For questions, contact:{" "}
                    <a href="mailto:mmccoyinfo@gmail.com" className="text-blue-600 underline">
                        mmccoyinfo@gmail.com
                    </a>
                </p>
            </section>
        </div>
    );
}
