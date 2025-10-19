"use client";

import { useEffect, useState } from "react";

export default function WelcomeModal({
  isOpen,
  onClose,
  onSelectCountry
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectCountry: (country: string) => void;
}) {
  const [country, setCountry] = useState("MA");

  useEffect(() => {
    if (isOpen) {
      (document.getElementById("welcome_modal") as HTMLDialogElement | null)?.showModal();
    } else {
      (document.getElementById("welcome_modal") as HTMLDialogElement | null)?.close();
    }
  }, [isOpen]);

  return (
    <dialog id="welcome_modal" className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Welcome to TRICINTY ⚡</h3>
        <p className="py-2">Choose your country to auto-apply the correct tariffs.</p>
        <select
          className="select select-bordered w-full"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="MA">Morocco</option>
          <option value="FR">France</option>
          <option value="US">USA</option>
          <option value="Other">Other (Manual)</option>
        </select>
        <div className="modal-action">
          <button className="btn" onClick={onClose}>Skip</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onSelectCountry(country);
              onClose();
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </dialog>
  );
}
