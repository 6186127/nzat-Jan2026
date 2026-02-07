import { useState } from "react";
import type { WorkCard, Status, CarDetails } from "@/types";
import { PartFlowColumn } from "./PartFlowColum";
// import { AddCardModal } from "/AddCardModal";
import { AddCardModal } from "@/features/partFlow/components/AddCardModal";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

const STATUSES: Status[] = [
  "pending_order",
  "needs_pt",
  "parts_trader",
  "pickup_or_transit",
];

// 初始数据
const initialCards: WorkCard[] = [
  {
    id: "1",
    carInfo: "TOYOTA PASSO - MLP309",
    parts: ["前保险杠"],
    status: "pending_order",
    notes: [
      {
        id: "n1",
        text: "客户要求使用原厂配件",
        timestamp: new Date("2026-02-03T10:30:00"),
      },
    ],
    isArchived: false,
    createdAt: new Date("2026-02-01T09:00:00"),
    details: {
      owner: "Zhang ",
      phone: "138-1234-5678",
      vin: "LFVBA24B8E3123456",
      mileage: "45000",
      issue: "前部碰撞，需更换保险杠和大灯，常规保养",
    },
  },
  {
    id: "2",
    carInfo: "TOYOTA PASSO - MLP309",
    parts: ["刹车片", "刹车盘", "刹车油"],
    status: "needs_pt",
    notes: [
      {
        id: "n2",
        text: "配件已下单，预计3天到货",
        timestamp: new Date("2026-02-02T14:20:00"),
      },
    ],
    isArchived: false,
    createdAt: new Date("2026-02-02T10:30:00"),
    details: {
      owner: "李",
      phone: "139-8765-4321",
      vin: "WBAKB8C51DE789012",
      mileage: "68000公里",
      issue: "刹车异响，需要更换刹车系统",
    },
  },
  {
    id: "3",
    carInfo: "TOYOTA PASSO - MLP309",
    parts: ["空调滤芯", "空气滤芯"],
    status: "parts_trader",
    notes: [],
    isArchived: false,
    createdAt: new Date("2026-02-03T14:00:00"),
    details: {
      owner: "eirc",
      phone: "136-5555-6666",
      vin: "WDD2050081F345678",
      mileage: "32000公里",
      issue: "常规保养，更换滤芯",
    },
  },
  {
    id: "4",
    carInfo: "TOYOTA PASSO - MLP309",
    parts: ["雨刷器", "玻璃水"],
    status: "pickup_or_transit",
    notes: [
      {
        id: "n3",
        text: "已通知客户取车",
        timestamp: new Date("2026-02-04T09:00:00"),
      },
    ],
    isArchived: false,
    createdAt: new Date("2026-02-03T16:00:00"),
    details: {
      owner: "刘先生",
      phone: "137-8888-9999",
      vin: "LVGBM5AE8DG901234",
      mileage: "58000公里",
      issue: "雨刷老化，需要更换",
    },
  },
];

export function PartFlowPage() {
  const [cards, setCards] = useState<WorkCard[]>(initialCards);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const moveCard = (cardId: string, newStatus: Status) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? { ...card, status: newStatus }
          : card,
      ),
    );
  };

  const deleteCard = (cardId: string) => {
    setCards((prevCards) =>
      prevCards.filter((card) => card.id !== cardId),
    );
  };

  const archiveCard = (cardId: string) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? { ...card, isArchived: true }
          : card,
      ),
    );
  };

  const addNote = (cardId: string, noteText: string) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              notes: [
                ...card.notes,
                {
                  id: `n${Date.now()}`,
                  text: noteText,
                  timestamp: new Date(),
                },
              ],
            }
          : card,
      ),
    );
  };

  const deleteNote = (cardId: string, noteId: string) => {
    setCards((prevCards) =>
      prevCards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              notes: card.notes.filter(
                (note) => note.id !== noteId,
              ),
            }
          : card,
      ),
    );
  };

  const addCard = (
    carInfo: string,
    parts: string[],
    details: CarDetails,
  ) => {
    const newCard: WorkCard = {
      id: `card${Date.now()}`,
      carInfo,
      parts,
      status: "pending_order",
      notes: [],
      isArchived: false,
      createdAt: new Date(),
      details,
    };
    setCards((prevCards) => [...prevCards, newCard]);
  };

  const activeCards = cards.filter((card) => !card.isArchived);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            配件预定
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STATUSES.map((status) => (
            <PartFlowColumn
              key={status}
              status={status}
              cards={activeCards.filter(
                (card) => card.status === status,
              )}
              onMoveCard={moveCard}
              onDeleteCard={deleteCard}
              onArchiveCard={archiveCard}
              onAddNote={addNote}
              onDeleteNote={deleteNote}
            />
          ))}
        </div>

        {isModalOpen && (
          <AddCardModal
            onClose={() => setIsModalOpen(false)}
            onAdd={addCard}
          />
        )}
      </div>
    </DndProvider>
  );
}
