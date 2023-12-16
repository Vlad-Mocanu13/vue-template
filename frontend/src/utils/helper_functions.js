const A_KEYCODE = 65;
const Z_KEYCODE = 90;
const ZERO_KEYCODE = 48;
const NINE_KEYCODE = 57;
const BACKSPACE_KEYCODE = 8;
const SPACE_KEYCODE = 32;
const LEFT_KEYCODE = 37;
const RIGHT_KEYCODE = 39;
const NEWLINE_KEYCODE = 13;

export const isValidCharacter = (keyCode) => {
  return (
    (keyCode >= A_KEYCODE && keyCode <= Z_KEYCODE) ||
    (keyCode >= ZERO_KEYCODE && keyCode <= NINE_KEYCODE) ||
    keyCode === BACKSPACE_KEYCODE ||
    keyCode === LEFT_KEYCODE || keyCode === RIGHT_KEYCODE ||
    keyCode === SPACE_KEYCODE || keyCode === NEWLINE_KEYCODE
  );
};

export const isValidDigit = (keyCode) => {
  return (
    (keyCode >= ZERO_KEYCODE && keyCode <= NINE_KEYCODE) ||
    keyCode === BACKSPACE_KEYCODE ||
    keyCode === LEFT_KEYCODE || keyCode === RIGHT_KEYCODE
  );
};

export const getMonthName = (date) => {
  const MONTH_NAMES = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie",
  ];

  if (date instanceof Date) {
    return MONTH_NAMES[date.getMonth()];
  } else if (typeof date === "number") {
    return MONTH_NAMES[date];
  }
};

export const downloadTextFile = (text, fileName) => {
  const CSV_URL = `data:text/csv;charset=utf-8,${text}`;
  const downloadLink = document.createElement("a");

  downloadLink.setAttribute("href", encodeURI(CSV_URL));
  downloadLink.setAttribute("download", fileName);

  document.body.appendChild(downloadLink);

  downloadLink.click();
};

export const downloadImageFile = (fileBytes, fileName, fileType) => {
  const ALLOWED_FILE_TYPES = ["jpg", "png", "jpeg"]
  if (ALLOWED_FILE_TYPES.includes(fileType)) {
    var blob = new Blob([fileBytes], {
      type: `image/${fileType}`,
    });
    var link = document.createElement("a");
    var url = window.URL || window.webkitURL;
    var img = new Image();
    img.src = url.createObjectURL(blob)
    link.href = url.createObjectURL(blob);
    link.download = fileName;
    link.innerHTML = "Click here to download the file";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const downloadBinaryFile = (filebytes, filename, filetype) => {
  var bytes = new Uint8Array(filebytes);
  if (filetype === "pdf") {
    var blob = new Blob([bytes], { responseType: "application/" + filetype });
  } else if (filetype === "png") {
    var blob = new Blob([bytes], { responseType: "image/" + filetype });
  } else {
    var blob = new Blob([filebytes], {
      type: "text/plain",
    });
  }
  var link = document.createElement("a");
  var url = window.URL || window.webkitURL;
  link.href = url.createObjectURL(blob);
  link.download = filename;
  link.innerHTML = "Click here to download the file";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadBase64BinaryFile = (fileBytes, fileName, fileType) => {
  const BUFFER_STRING = window.atob(fileBytes);
  const bytes = new Uint8Array(BUFFER_STRING.length);

  for (let i = 0; i < BUFFER_STRING.length; i++) {
    bytes[i] = BUFFER_STRING.charCodeAt(i);
  }

  const BLOB = new Blob([bytes], {
    responseType: `application/${fileType}`,
  });
  const downloadLink = document.createElement("a");
  const URL = window.URL || window.webkitURL;

  downloadLink.href = URL.createObjectURL(BLOB);
  downloadLink.download = fileName;
  downloadLink.innerHTML = "Click here to download the file";

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
};

export const makeScrollable = (containerid, sensitivity) => {
  setTimeout(() => {
    //to allow the creation on page
    const container = document.getElementById(containerid);
    if (container == null) return;
    const slider = container.querySelector(".cardtitle");
    if (slider == null) return;
    // slider.style.cursor="grab"
    slider.classList.add("draggable");
    let isDown = false;
    let startX;
    let scrollLeft;
    slider.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });
    slider.addEventListener("mouseleave", () => {
      isDown = false;
    });
    slider.addEventListener("mouseup", () => {
      isDown = false;
    });
    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk =
        (x - startX) * (typeof sensitivity == "number" ? sensitivity : 5);
      container.scrollLeft = scrollLeft - walk;
    });
  }, 200);
};



