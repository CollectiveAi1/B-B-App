import React, { useState, useMemo } from 'react';
import { GuestReview, Booking } from '../types';
import Card from './Card';
import { ChatBubbleOvalLeftEllipsisIcon, StarIcon, UserIcon } from './Icons';
import { formatDistanceToNow } from 'date-fns';

interface ReviewsPanelProps {
  reviews: GuestReview[];
  bookings: Booking[];
  onAddReview: (review: Omit<GuestReview, 'id' | 'timestamp'>) => void;
}

const StarRating: React.FC<{ rating: number; setRating?: (rating: number) => void; }> = ({ rating, setRating }) => {
    const [hoverRating, setHoverRating] = useState(0);

    return (
        <div className="flex items-center">
            {[...Array(5)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <StarIcon
                        key={starValue}
                        className={`w-5 h-5 ${setRating ? 'cursor-pointer' : ''} ${starValue <= (hoverRating || rating) ? 'text-yellow-400' : 'text-slate-300 dark:text-slate-600'}`}
                        onClick={() => setRating?.(starValue)}
                        onMouseEnter={() => setRating && setHoverRating(starValue)}
                        onMouseLeave={() => setRating && setHoverRating(0)}
                    />
                );
            })}
        </div>
    );
};


const ReviewsPanel: React.FC<ReviewsPanelProps> = ({ reviews, bookings, onAddReview }) => {
    const [showForm, setShowForm] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState('');
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    const uniqueBookings = useMemo(() => {
        const unique = new Map<string, Booking>();
        // Show only past bookings that haven't been reviewed
        const reviewedGuests = new Set(reviews.map(r => r.guestName));
        const now = new Date();
        bookings
            .filter(b => b.checkOut < now && !reviewedGuests.has(b.guestName))
            .forEach(b => {
                const key = `${b.guestName}-${b.property}`;
                if (!unique.has(key)) {
                    unique.set(key, b);
                }
            });
        return Array.from(unique.values());
    }, [bookings, reviews]);
    
    const resetForm = () => {
        setSelectedBookingId('');
        setRating(0);
        setComment('');
        setShowForm(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const selectedBooking = bookings.find(b => b.id === selectedBookingId);
        if (!selectedBooking || rating === 0 || !comment.trim()) {
            alert("Please fill out all fields.");
            return;
        }

        onAddReview({
            guestName: selectedBooking.guestName,
            property: selectedBooking.property,
            rating,
            comment: comment.trim(),
        });

        resetForm();
    };

    return (
        <Card title="Guest Reviews" icon={<ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6" />}>
            <div className="mb-4">
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Add New Review
                    </button>
                )}
                {showForm && (
                    <form onSubmit={handleSubmit} className="p-4 space-y-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
                         <h3 className="text-lg font-medium">New Review</h3>
                        <div>
                            <label htmlFor="booking-select" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Select Guest & Stay</label>
                            <select
                                id="booking-select"
                                value={selectedBookingId}
                                onChange={(e) => setSelectedBookingId(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            >
                                <option value="">-- Select a past stay --</option>
                                {uniqueBookings.map(b => <option key={b.id} value={b.id}>{b.guestName} at {b.property}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rating</label>
                            <div className="mt-1">
                                <StarRating rating={rating} setRating={setRating} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="comment" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Comment</label>
                             <textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Write the guest's feedback here..."
                                rows={4}
                                className="mt-1 w-full text-sm border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                            ></textarea>
                        </div>
                         <div className="flex justify-end space-x-2">
                            <button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 border border-transparent rounded-md hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">
                                Submit Review
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <ul className="space-y-4">
                {reviews.length > 0 ? reviews.map(review => (
                    <li key={review.id} className="p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center">
                                 <UserIcon className="w-8 h-8 p-1.5 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 mr-3 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{review.guestName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{review.property}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <StarRating rating={review.rating} />
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatDistanceToNow(review.timestamp, { addSuffix: true })}</p>
                            </div>
                        </div>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{review.comment}</p>
                    </li>
                )) : <p className="text-center text-slate-500 dark:text-slate-400 mt-8">No reviews yet.</p>}
            </ul>
        </Card>
    );
};

export default ReviewsPanel;
