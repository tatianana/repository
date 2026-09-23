import { catBurst } from "./effects.js";

const FIREBASE_VERSION = "10.12.2";
const config = JSON.parse(document.getElementById("wishlist-config").textContent);
const notice = document.getElementById("notice");
const cards = new Map(
  [...document.querySelectorAll(".card[data-gift-id]")].map((el) => [el.dataset.giftId, el]),
);

function showNotice(text, isError = false) {
  notice.textContent = text;
  notice.classList.toggle("is-error", isError);
  notice.hidden = false;
}

function render(bookings, myId) {
  for (const [giftId, card] of cards) {
    const owner = bookings[giftId];
    const mine = Boolean(owner) && owner === myId;
    const other = Boolean(owner) && !mine;
    const bookBtn = card.querySelector(".btn--book");
    const cancelBtn = card.querySelector(".btn--cancel");
    const badge = card.querySelector(".card__badge");

    card.classList.remove("is-loading");
    card.classList.toggle("is-booked-mine", mine);
    card.classList.toggle("is-booked-other", other);

    badge.hidden = !owner;
    badge.textContent = mine ? "твоя бронь 😻" : "занято 😿";

    bookBtn.hidden = mine;
    bookBtn.disabled = other;
    bookBtn.textContent = other ? "уже занято" : "забронировать ✦";
    cancelBtn.hidden = !mine;
    cancelBtn.disabled = false;
  }
}

async function createFirebaseStore() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const app = initializeApp(config.firebase);
  const { user } = await auth.signInAnonymously(auth.getAuth(app));
  const db = fs.getFirestore(app);
  const col = fs.collection(db, config.collection);

  return {
    myId: user.uid,
    subscribe(onChange) {
      fs.onSnapshot(
        col,
        (snap) => {
          const bookings = {};
          snap.forEach((d) => { bookings[d.id] = d.data().by; });
          onChange(bookings);
        },
        (err) => showNotice(`Не удалось загрузить брони: ${err.message}`, true),
      );
    },
    async book(giftId) {
      const ref = fs.doc(col, giftId);
      await fs.runTransaction(db, async (tx) => {
        if ((await tx.get(ref)).exists()) throw new Error("Этот подарок уже кто-то забронировал");
        tx.set(ref, { by: user.uid, at: fs.serverTimestamp() });
      });
    },
    async cancel(giftId) {
      await fs.deleteDoc(fs.doc(col, giftId));
    },
  };
}

function createLocalStore() {
  const KEY = "wishlist-demo-bookings";
  const myId = "me";
  let listener = () => {};
  const read = () => JSON.parse(localStorage.getItem(KEY) || "{}");
  const write = (data) => {
    localStorage.setItem(KEY, JSON.stringify(data));
    listener(data);
  };

  return {
    myId,
    subscribe(onChange) {
      listener = onChange;
      onChange(read());
    },
    async book(giftId) {
      const data = read();
      if (data[giftId]) throw new Error("Этот подарок уже забронирован");
      write({ ...data, [giftId]: myId });
    },
    async cancel(giftId) {
      const { [giftId]: _, ...rest } = read();
      write(rest);
    },
  };
}

async function main() {
  let store;
  if (config.firebase?.apiKey) {
    try {
      store = await createFirebaseStore();
    } catch (err) {
      showNotice(`Не удалось подключиться к базе броней: ${err.message}`, true);
      return;
    }
  } else {
    store = createLocalStore();
    showNotice("⚠ демо-режим: Firebase не настроен, брони сохраняются только в этом браузере");
  }

  store.subscribe((bookings) => render(bookings, store.myId));

  for (const [giftId, card] of cards) {
    const bookBtn = card.querySelector(".btn--book");
    const cancelBtn = card.querySelector(".btn--cancel");

    bookBtn.addEventListener("click", async () => {
      bookBtn.disabled = true;
      try {
        await store.book(giftId);
        catBurst(card.querySelector(".card__media"));
      } catch (err) {
        showNotice(err.message, true);
        bookBtn.disabled = false;
      }
    });

    cancelBtn.addEventListener("click", async () => {
      if (!confirm("Точно отменить бронь? Котик расстроится 😿")) return;
      cancelBtn.disabled = true;
      try {
        await store.cancel(giftId);
      } catch (err) {
        showNotice(`Не удалось отменить бронь: ${err.message}`, true);
        cancelBtn.disabled = false;
      }
    });
  }
}

main();
